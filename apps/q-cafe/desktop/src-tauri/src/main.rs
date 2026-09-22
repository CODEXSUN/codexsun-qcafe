#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod license;

use chrono::Local;
use rfd::{MessageButtons, MessageDialog, MessageDialogResult, MessageLevel};
use semver::Version;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
#[cfg(target_os = "windows")]
use std::os::windows::ffi::OsStrExt;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use std::{
    env, fs,
    io::{Read, Write},
    net::TcpStream,
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::Mutex,
    thread::sleep,
    time::Duration,
};
use tauri::{AppHandle, Manager};
use uuid::Uuid;

struct ApiProcess(Mutex<Option<Child>>);

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct StorageSettings {
    backup_directory: PathBuf,
    data_directory: PathBuf,
    image_directory: Option<PathBuf>,
    last_backup_date: Option<String>,
    schema_version: u8,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ImageStorageVerification {
    ok: bool,
    folder_path: String,
    is_write_protected: bool,
    can_write: bool,
    message: String,
    timestamp: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PrinterInfo {
    name: String,
    port_name: Option<String>,
    is_default: bool,
    is_interactive: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PrinterServiceStatus {
    connected: bool,
    spooler_running: bool,
    service_installed: bool,
    service_running: bool,
    default_printer: Option<String>,
    default_printer_port: Option<String>,
    printers: Vec<PrinterInfo>,
    message: String,
}

const PRINT_SERVICE_NAME: &str = "CODEXSUNQCafePrint";
const PRINT_SERVICE_ADDRESS: &str = "127.0.0.1:4181";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawReceiptRequest {
    printer_name: Option<String>,
    document_name: String,
    receipt: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RawPrintServiceRequest {
    printer_name: String,
    document_name: String,
    receipt: String,
}

#[derive(Deserialize)]
struct RawPrintServiceResponse {
    ok: bool,
    job_id: Option<u32>,
    message: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DirectPrintResult {
    queued: bool,
    job_id: Option<u32>,
    printer: String,
    message: String,
}

#[cfg(target_os = "windows")]
fn printer_service_status() -> PrinterServiceStatus {
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct WindowsPrinterRaw {
        name: String,
        port_name: Option<String>,
        is_default: bool,
        is_interactive: bool,
    }

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct WindowsPrinterStatus {
        spooler_running: bool,
        service_installed: bool,
        service_running: bool,
        default_printer: Option<String>,
        default_printer_port: Option<String>,
        printers: Option<Vec<WindowsPrinterRaw>>,
    }

    let script = format!(
        "& {{ \
             $spooler = Get-Service -Name Spooler -ErrorAction SilentlyContinue; \
             $service = Get-Service -Name {PRINT_SERVICE_NAME} -ErrorAction SilentlyContinue; \
             $printers = @(Get-CimInstance -ClassName Win32_Printer -ErrorAction SilentlyContinue | ForEach-Object {{ \
                 [PSCustomObject]@{{ \
                     name = [string]$_.Name; \
                     portName = if ($_.PortName) {{ [string]$_.PortName }} else {{ $null }}; \
                     isDefault = [bool]$_.Default; \
                     isInteractive = [bool]($_.PortName -like '*PORTPROMPT*') \
                 }} \
             }}); \
             $def = $printers | Where-Object {{ $_.isDefault }} | Select-Object -First 1; \
             [PSCustomObject]@{{ \
                 spoolerRunning = [bool]($spooler -and $spooler.Status -eq 'Running'); \
                 serviceInstalled = [bool]$service; \
                 serviceRunning = [bool]($service -and $service.Status -eq 'Running'); \
                 defaultPrinter = if ($def) {{ [string]$def.name }} else {{ $null }}; \
                 defaultPrinterPort = if ($def) {{ [string]$def.portName }} else {{ $null }}; \
                 printers = $printers \
             }} | ConvertTo-Json -Compress -Depth 3 \
         }}"
    );
    let result = Command::new("powershell.exe")
        .args(["-NoProfile", "-NonInteractive", "-Command", &script])
        .creation_flags(0x08000000)
        .output()
        .ok()
        .and_then(|output| output.status.success().then_some(output.stdout))
        .and_then(|output| serde_json::from_slice::<WindowsPrinterStatus>(&output).ok());

    match result {
        Some(status) => {
            let printers_list = status
                .printers
                .unwrap_or_default()
                .into_iter()
                .map(|p| PrinterInfo {
                    name: p.name,
                    port_name: p.port_name,
                    is_default: p.is_default,
                    is_interactive: p.is_interactive,
                })
                .collect::<Vec<_>>();

            let has_printer = !printers_list.is_empty() || status.default_printer.is_some();
            let connected = status.spooler_running
                && status.service_installed
                && status.service_running
                && has_printer;
            let message = if !status.spooler_running {
                "Start the Windows Print Spooler service, then check the printer again.".to_string()
            } else if !status.service_installed {
                "Install the CODEXSUN Q Cafe Windows Print Service to send receipts and KOT tickets to the selected Windows queues.".to_string()
            } else if !status.service_running {
                "Start or repair the CODEXSUN Q Cafe Windows Print Service, then check again."
                    .to_string()
            } else if printers_list.is_empty() && status.default_printer.is_none() {
                "No printers found on Windows. Connect or install a printer.".to_string()
            } else {
                "CODEXSUN Q Cafe Windows Print Service is connected and ready to submit receipt and KOT jobs to the selected Windows queues.".to_string()
            };

            PrinterServiceStatus {
                connected,
                spooler_running: status.spooler_running,
                service_installed: status.service_installed,
                service_running: status.service_running,
                default_printer: status.default_printer,
                default_printer_port: status.default_printer_port,
                printers: printers_list,
                message,
            }
        }
        None => PrinterServiceStatus {
            connected: false,
            spooler_running: false,
            service_installed: false,
            service_running: false,
            default_printer: None,
            default_printer_port: None,
            printers: Vec::new(),
            message: "Q Cafe could not check the Windows printing service.".to_string(),
        },
    }
}

#[cfg(not(target_os = "windows"))]
fn printer_service_status() -> PrinterServiceStatus {
    PrinterServiceStatus {
        connected: false,
        spooler_running: false,
        service_installed: false,
        service_running: false,
        default_printer: None,
        default_printer_port: None,
        printers: Vec::new(),
        message: "The Q Cafe printer service is available only on Windows.".to_string(),
    }
}

fn application_settings_dir(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("Windows application data directory is available")
}

fn application_directory() -> Result<PathBuf, String> {
    let executable = env::current_exe().map_err(|error| error.to_string())?;
    executable
        .parent()
        .map(PathBuf::from)
        .ok_or_else(|| "Q Cafe application directory is unavailable.".to_string())
}

fn raw_print_service_binary() -> Result<PathBuf, String> {
    let installed_binary = application_directory()?.join("q-cafe-print-service.exe");
    if installed_binary.is_file() {
        return Ok(installed_binary);
    }
    let bundled_binary = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("resources")
        .join("q-cafe-print-service.exe");
    if bundled_binary.is_file() {
        return Ok(bundled_binary);
    }
    Err(
        "Q Cafe Windows Print Service files are missing. Run the Q Cafe installer again."
            .to_string(),
    )
}

fn raw_print_service_installer() -> Result<PathBuf, String> {
    let installed_script = application_directory()?.join("q-cafe-print-service-installer.cjs");
    if installed_script.is_file() {
        return Ok(installed_script);
    }
    let bundled_script = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("resources")
        .join("q-cafe-print-service-installer.cjs");
    if bundled_script.is_file() {
        return Ok(bundled_script);
    }
    Err(
        "Q Cafe print-service installer files are missing. Run the Q Cafe installer again."
            .to_string(),
    )
}

fn node_binary(application_directory: &PathBuf) -> PathBuf {
    if let Some(path) = env::var_os("QCAFE_NODE_BINARY") {
        return PathBuf::from(path);
    }

    application_directory.join("node.exe")
}

fn default_data_directory(settings_dir: &Path) -> PathBuf {
    settings_dir.join("data")
}

fn settings_path(settings_dir: &Path) -> PathBuf {
    settings_dir.join("settings.json")
}

fn image_directory(settings: &StorageSettings) -> PathBuf {
    settings
        .image_directory
        .clone()
        .unwrap_or_else(|| settings.data_directory.join("images"))
}

fn verify_image_directory(settings: &StorageSettings) -> Result<ImageStorageVerification, String> {
    verify_image_directory_path(&image_directory(settings))
}

fn verify_image_directory_path(directory: &Path) -> Result<ImageStorageVerification, String> {
    fs::create_dir_all(&directory)
        .map_err(|error| format!("Q Cafe image folder is unavailable: {error}"))?;
    let probe = directory.join(".q-cafe-image-storage-probe");
    fs::write(&probe, "ok")
        .map_err(|error| format!("Q Cafe image folder is not writable: {error}"))?;
    fs::remove_file(&probe)
        .map_err(|error| format!("Q Cafe image folder cannot be verified: {error}"))?;
    Ok(ImageStorageVerification {
        ok: true,
        folder_path: directory.display().to_string(),
        is_write_protected: false,
        can_write: true,
        message: "Q Cafe image storage is verified and writable.".to_string(),
        timestamp: Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
    })
}

fn choose_data_directory(settings_dir: &Path) -> Result<PathBuf, String> {
    let default = default_data_directory(settings_dir);
    rfd::FileDialog::new()
        .set_title("Choose Q Cafe data folder")
        .set_directory(&default)
        .pick_folder()
        .ok_or_else(|| "Q Cafe needs a data folder before it can start. Choose a folder and start Q Cafe again.".to_string())
}

fn choose_image_directory(settings: &StorageSettings) -> Result<PathBuf, String> {
    rfd::FileDialog::new()
        .set_title("Choose Q Cafe image storage folder")
        .set_directory(image_directory(settings))
        .pick_folder()
        .ok_or_else(|| "Q Cafe image storage folder was not changed.".to_string())
}

fn is_item_image(path: &Path) -> bool {
    matches!(
        path.extension().and_then(|extension| extension.to_str()),
        Some(extension) if ["jpg", "jpeg", "png", "webp"].contains(&extension.to_ascii_lowercase().as_str())
    )
}

fn move_item_images(source: &Path, destination: &Path) -> Result<(), String> {
    if source == destination || !source.is_dir() {
        return Ok(());
    }
    fs::create_dir_all(destination).map_err(|error| error.to_string())?;
    let files = fs::read_dir(source)
        .map_err(|error| format!("Q Cafe could not read the current image folder: {error}"))?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| path.is_file() && is_item_image(path))
        .collect::<Vec<_>>();

    for source_file in &files {
        let destination_file = destination.join(
            source_file
                .file_name()
                .ok_or_else(|| "Q Cafe image file name is invalid.".to_string())?,
        );
        if destination_file.exists()
            && fs::read(source_file).map_err(|error| error.to_string())?
                != fs::read(&destination_file).map_err(|error| error.to_string())?
        {
            return Err(format!(
                "The selected image folder already contains a different file named {}. Rename that file or choose another folder.",
                destination_file.file_name().unwrap_or_default().to_string_lossy()
            ));
        }
    }

    for source_file in files {
        let destination_file = destination.join(
            source_file
                .file_name()
                .ok_or_else(|| "Q Cafe image file name is invalid.".to_string())?,
        );
        if !destination_file.exists() {
            fs::copy(&source_file, &destination_file)
                .map_err(|error| format!("Q Cafe could not move an item image: {error}"))?;
        }
        fs::remove_file(&source_file)
            .map_err(|error| format!("Q Cafe could not finish moving an item image: {error}"))?;
    }
    Ok(())
}

fn validate_data_directory(path: &Path) -> Result<(), String> {
    if path.as_os_str().is_empty() || path.parent().is_none() {
        return Err("Choose a folder for Q Cafe data, not a drive root.".to_string());
    }
    fs::create_dir_all(path)
        .map_err(|error| format!("Q Cafe data folder is unavailable: {error}"))?;
    let probe = path.join(".q-cafe-write-probe");
    fs::write(&probe, "ok")
        .map_err(|error| format!("Q Cafe data folder is not writable: {error}"))?;
    fs::remove_file(probe)
        .map_err(|error| format!("Q Cafe data folder cannot be verified: {error}"))
}

fn save_storage_settings(settings_dir: &Path, settings: &StorageSettings) -> Result<(), String> {
    fs::create_dir_all(settings_dir).map_err(|error| error.to_string())?;
    let contents = serde_json::to_string_pretty(settings).map_err(|error| error.to_string())?;
    fs::write(settings_path(settings_dir), contents).map_err(|error| error.to_string())
}

fn load_or_configure_storage(settings_dir: &Path) -> Result<StorageSettings, String> {
    let path = settings_path(settings_dir);
    let settings = if path.is_file() {
        serde_json::from_str::<StorageSettings>(
            &fs::read_to_string(&path).map_err(|error| error.to_string())?,
        )
        .map_err(|error| format!("Q Cafe storage settings are invalid: {error}"))?
    } else {
        let data_directory = choose_data_directory(settings_dir)?;
        StorageSettings {
            backup_directory: data_directory.join("backups"),
            data_directory,
            image_directory: None,
            last_backup_date: None,
            schema_version: 1,
        }
    };
    validate_data_directory(&settings.data_directory)?;
    fs::create_dir_all(&settings.backup_directory)
        .map_err(|error| format!("Q Cafe backup folder is unavailable: {error}"))?;
    verify_image_directory(&settings)?;
    save_storage_settings(settings_dir, &settings)?;
    Ok(settings)
}

fn write_api_file(root: &PathBuf, relative_path: &str, contents: &str) -> Result<(), String> {
    let path = root.join(relative_path);
    let parent = path
        .parent()
        .ok_or_else(|| format!("Q Cafe API path is invalid: {}", path.display()))?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    fs::write(path, contents).map_err(|error| error.to_string())
}

fn prepare_api_runtime(data_dir: &PathBuf) -> Result<PathBuf, String> {
    let api_root = data_dir.join("runtime").join("api");
    write_api_file(
        &api_root,
        "src/server.mjs",
        include_str!("../../../api/src/server.mjs"),
    )?;
    write_api_file(
        &api_root,
        "src/store.mjs",
        include_str!("../../../api/src/store.mjs"),
    )?;
    write_api_file(
        &api_root,
        "src/backup.mjs",
        include_str!("../../../api/src/backup.mjs"),
    )?;
    write_api_file(
        &api_root,
        "src/staff-auth.mjs",
        include_str!("../../../api/src/staff-auth.mjs"),
    )?;
    write_api_file(
        &api_root,
        "migrations/001-restaurant.sql",
        include_str!("../../../api/migrations/001-restaurant.sql"),
    )?;
    write_api_file(
        &api_root,
        "migrations/002-editable-order-lines.sql",
        include_str!("../../../api/migrations/002-editable-order-lines.sql"),
    )?;
    write_api_file(
        &api_root,
        "migrations/003-sync-and-activity.sql",
        include_str!("../../../api/migrations/003-sync-and-activity.sql"),
    )?;
    write_api_file(
        &api_root,
        "migrations/004-pos-billing.sql",
        include_str!("../../../api/migrations/004-pos-billing.sql"),
    )?;
    write_api_file(
        &api_root,
        "migrations/005-staff-identity.sql",
        include_str!("../../../api/migrations/005-staff-identity.sql"),
    )?;
    write_api_file(
        &api_root,
        "migrations/006-customer-menu-catalog.sql",
        include_str!("../../../api/migrations/006-customer-menu-catalog.sql"),
    )?;
    write_api_file(
        &api_root,
        "migrations/007-numeric-menu-codes.sql",
        include_str!("../../../api/migrations/007-numeric-menu-codes.sql"),
    )?;
    write_api_file(
        &api_root,
        "migrations/008-simple-pos-bill-numbers.sql",
        include_str!("../../../api/migrations/008-simple-pos-bill-numbers.sql"),
    )?;
    write_api_file(
        &api_root,
        "migrations/009-master-data-model.sql",
        include_str!("../../../api/migrations/009-master-data-model.sql"),
    )?;
    Ok(api_root)
}

fn wait_for_api(
    child: &mut Child,
    api_log: &Path,
    runtime_instance_id: &str,
) -> Result<(), String> {
    for _ in 0..30 {
        if let Some(status) = child.try_wait().map_err(|error| error.to_string())? {
            return Err(format!(
                "Q Cafe local service stopped during startup ({status}). Review {}.",
                api_log.display()
            ));
        }
        if let Ok(response) = reqwest::blocking::get("http://127.0.0.1:4180/health") {
            let is_own_runtime = response
                .headers()
                .get("X-Q-Cafe-Runtime-Instance")
                .and_then(|value| value.to_str().ok())
                .is_some_and(|value| value == runtime_instance_id);
            if response.status().is_success() && is_own_runtime {
                return Ok(());
            }
        }
        sleep(Duration::from_millis(100));
    }
    let _ = child.kill();
    Err(format!(
        "Q Cafe local service did not start. Review {} and reopen Q Cafe.",
        api_log.display()
    ))
}

fn backup_database(
    node: &Path,
    api_root: &Path,
    database_path: &Path,
    backup_directory: &Path,
) -> Result<(), String> {
    if !database_path.is_file() {
        return Ok(());
    }
    let timestamp = Local::now().format("%Y%m%d-%H%M%S").to_string();
    let destination = backup_directory.join(format!("q-cafe-{timestamp}.sqlite"));
    let mut command = Command::new(node);
    command
        .arg(api_root.join("src").join("backup.mjs"))
        .arg(database_path)
        .arg(&destination)
        .current_dir(api_root);
    #[cfg(target_os = "windows")]
    command.creation_flags(0x08000000);
    let status = command
        .status()
        .map_err(|error| format!("Q Cafe database backup could not start: {error}"))?;
    if !status.success() {
        return Err("Q Cafe database backup failed. Your data was not changed.".to_string());
    }
    Ok(())
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct UpdateAsset {
    url: String,
    sha256: String,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct UpdateManifest {
    version: String,
    stable: bool,
    notes: String,
    installer: UpdateAsset,
}

fn update_manifest_url() -> String {
    env::var("QCAFE_UPDATE_MANIFEST_URL").unwrap_or_else(|_| {
        "https://github.com/CODEXSUN/codexsun-qcafe/releases/latest/download/qcafe-update.json"
            .to_string()
    })
}

fn check_for_update() -> Result<Option<UpdateManifest>, String> {
    let response = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(12))
        .user_agent("Q-Cafe-Desktop")
        .build()
        .map_err(|error| error.to_string())?
        .get(update_manifest_url())
        .send()
        .map_err(|error| error.to_string())?
        .error_for_status()
        .map_err(|error| error.to_string())?;
    let update = response
        .json::<UpdateManifest>()
        .map_err(|error| error.to_string())?;
    let current = Version::parse(env!("CARGO_PKG_VERSION")).map_err(|error| error.to_string())?;
    let available = Version::parse(&update.version)
        .map_err(|error| format!("Q Cafe update version is invalid: {error}"))?;
    Ok((update.stable && available > current).then_some(update))
}

fn sha256_file(path: &Path) -> Result<String, String> {
    let mut file = fs::File::open(path).map_err(|error| error.to_string())?;
    let mut hasher = Sha256::new();
    let mut buffer = [0; 64 * 1024];
    loop {
        let read = file.read(&mut buffer).map_err(|error| error.to_string())?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}

fn download_verified_installer(update: &UpdateManifest) -> Result<PathBuf, String> {
    if !update.installer.url.starts_with("https://") {
        return Err("Q Cafe update download must use HTTPS.".to_string());
    }
    let directory = env::temp_dir().join("Q Cafe Updates").join(&update.version);
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    let installer = directory.join("qcafe-update-setup.exe");
    let response = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(120))
        .user_agent("Q-Cafe-Desktop")
        .build()
        .map_err(|error| error.to_string())?
        .get(&update.installer.url)
        .send()
        .map_err(|error| error.to_string())?
        .error_for_status()
        .map_err(|error| error.to_string())?;
    let bytes = response.bytes().map_err(|error| error.to_string())?;
    fs::write(&installer, bytes).map_err(|error| error.to_string())?;
    if sha256_file(&installer)? != update.installer.sha256.to_ascii_lowercase() {
        let _ = fs::remove_file(&installer);
        return Err("Q Cafe update verification failed. The installer was removed.".to_string());
    }
    Ok(installer)
}

fn launch_verified_installer(installer: &Path) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    let result = Command::new(installer)
        .arg("/S")
        .creation_flags(0x08000000)
        .spawn();
    #[cfg(not(target_os = "windows"))]
    let result = Command::new(installer).spawn();
    result
        .map(|_| ())
        .map_err(|_| "The verified installer could not start.".to_string())
}

fn request_api_shutdown() {
    let _ = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(2))
        .build()
        .and_then(|client| {
            client
                .post("http://127.0.0.1:4180/internal/shutdown")
                .header("Authorization", "Bearer desktop-local-operator")
                .send()
        })
        .and_then(|response| response.error_for_status());
}

fn stop_api(process: &ApiProcess) -> Result<(), String> {
    let mut child = match process
        .0
        .lock()
        .map_err(|_| "Q Cafe API process lock failed.")?
        .take()
    {
        Some(child) => child,
        None => return Ok(()),
    };
    request_api_shutdown();
    for _ in 0..50 {
        if child
            .try_wait()
            .map_err(|error| format!("Q Cafe local service could not stop: {error}"))?
            .is_some()
        {
            return Ok(());
        }
        sleep(Duration::from_millis(100));
    }
    child
        .kill()
        .map_err(|error| format!("Q Cafe local service could not stop: {error}"))?;
    let _ = child.wait();
    Ok(())
}

#[tauri::command]
fn qcafe_check_for_update() -> Result<Option<UpdateManifest>, String> {
    check_for_update()
}

#[tauri::command]
fn qcafe_install_update(process: tauri::State<'_, ApiProcess>) -> Result<(), String> {
    let update = check_for_update()?.ok_or_else(|| "Q Cafe is already up to date.".to_string())?;
    let installer = download_verified_installer(&update)?;
    stop_api(&process)?;
    launch_verified_installer(&installer)?;
    std::process::exit(0);
}

#[tauri::command]
fn qcafe_exit_application(
    app: AppHandle,
    process: tauri::State<'_, ApiProcess>,
) -> Result<(), String> {
    stop_api(&process)?;
    app.exit(0);
    Ok(())
}

fn start_api(app: &AppHandle) -> Result<Child, String> {
    let settings_dir = application_settings_dir(app);
    let mut storage = load_or_configure_storage(&settings_dir)?;
    let api_root = prepare_api_runtime(&settings_dir)?;
    let database_path = storage.data_directory.join("q-cafe.sqlite");
    let node = node_binary(&application_directory()?);
    if !node.is_file() {
        return Err(format!(
            "Q Cafe Node runtime is missing: {}",
            node.display()
        ));
    }
    let today = Local::now().format("%Y-%m-%d").to_string();
    if storage.last_backup_date.as_deref() != Some(&today) {
        backup_database(&node, &api_root, &database_path, &storage.backup_directory)?;
        if database_path.is_file() {
            storage.last_backup_date = Some(today);
            save_storage_settings(&settings_dir, &storage)?;
        }
    }

    let api_log_directory = storage.data_directory.join("runtime");
    fs::create_dir_all(&api_log_directory)
        .map_err(|error| format!("Q Cafe API log folder could not be created: {error}"))?;
    let api_log = api_log_directory.join("q-cafe-api.log");
    let log = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&api_log)
        .map_err(|error| format!("Q Cafe API log could not open: {error}"))?;
    let runtime_instance_id = Uuid::new_v4().to_string();
    let mut command = Command::new(node);
    command
        .arg(api_root.join("src").join("server.mjs"))
        .current_dir(&api_root)
        .env("QCAFE_DATABASE_PATH", database_path)
        .env("QCAFE_IMAGE_DIRECTORY", image_directory(&storage))
        .env("QCAFE_API_PORT", "4180")
        .env(
            "QCAFE_DEMO",
            env::var("QCAFE_DEMO").unwrap_or_else(|_| "false".to_string()),
        )
        .env("QCAFE_API_TOKEN", "desktop-local-operator")
        .env("QCAFE_RUNTIME_INSTANCE_ID", &runtime_instance_id)
        .env(
            "QCAFE_BOOTSTRAP_OWNER_PIN",
            env::var("QCAFE_BOOTSTRAP_OWNER_PIN").unwrap_or_default(),
        )
        .stdout(Stdio::from(
            log.try_clone().map_err(|error| error.to_string())?,
        ))
        .stderr(Stdio::from(log));
    #[cfg(target_os = "windows")]
    command.creation_flags(0x08000000);
    let mut child = command
        .spawn()
        .map_err(|error| format!("Q Cafe API could not start: {error}"))?;
    wait_for_api(&mut child, &api_log, &runtime_instance_id)?;
    Ok(child)
}

fn replace_api(app: &AppHandle, process: &ApiProcess) -> Result<(), String> {
    stop_api(process)?;
    let child = start_api(app)?;
    *process
        .0
        .lock()
        .map_err(|_| "Q Cafe API process lock failed.")? = Some(child);
    Ok(())
}

#[tauri::command]
fn qcafe_select_data_directory(
    app: AppHandle,
    process: tauri::State<'_, ApiProcess>,
) -> Result<String, String> {
    let settings_dir = application_settings_dir(&app);
    let data_directory = choose_data_directory(&settings_dir)?;
    validate_data_directory(&data_directory)?;
    let settings = StorageSettings {
        backup_directory: data_directory.join("backups"),
        data_directory: data_directory.clone(),
        image_directory: None,
        last_backup_date: None,
        schema_version: 1,
    };
    fs::create_dir_all(&settings.backup_directory).map_err(|error| error.to_string())?;
    verify_image_directory(&settings)?;
    save_storage_settings(&settings_dir, &settings)?;
    replace_api(&app, &process)?;
    Ok(data_directory.join("q-cafe.sqlite").display().to_string())
}

#[tauri::command]
fn qcafe_license_status(app: AppHandle) -> Result<license::LicenseStatus, String> {
    license::license_status(&application_settings_dir(&app))
}

#[tauri::command]
fn qcafe_reconnect_license(app: AppHandle) -> Result<license::LicenseStatus, String> {
    license::reconnect_license(&application_settings_dir(&app))
}

#[tauri::command]
fn qcafe_activate_license(
    app: AppHandle,
    process: tauri::State<'_, ApiProcess>,
    activation: license::ActivationRequest,
) -> Result<license::LicenseStatus, String> {
    let mut status = license::activate_license(&application_settings_dir(&app), activation)?;
    if status.licensed {
        if let Err(error) = replace_api(&app, &process) {
            status.message =
                format!("License verified. Q Cafe local service could not start: {error}");
        }
    }
    Ok(status)
}

#[tauri::command]
fn qcafe_skip_activation(
    app: AppHandle,
    process: tauri::State<'_, ApiProcess>,
) -> Result<license::LicenseStatus, String> {
    let status = license::skip_activation(&application_settings_dir(&app))?;
    replace_api(&app, &process)?;
    Ok(status)
}

#[tauri::command]
fn qcafe_verify_image_storage(app: AppHandle) -> Result<ImageStorageVerification, String> {
    let settings = load_or_configure_storage(&application_settings_dir(&app))?;
    verify_image_directory(&settings)
}

#[tauri::command]
fn qcafe_select_image_storage(
    app: AppHandle,
    process: tauri::State<'_, ApiProcess>,
) -> Result<ImageStorageVerification, String> {
    let settings_dir = application_settings_dir(&app);
    let mut settings = load_or_configure_storage(&settings_dir)?;
    let selected_directory = choose_image_directory(&settings)?;
    verify_image_directory_path(&selected_directory)?;
    let current_directory = image_directory(&settings);
    move_item_images(&current_directory, &selected_directory)?;
    settings.image_directory = Some(selected_directory);
    let verification = verify_image_directory(&settings)?;
    save_storage_settings(&settings_dir, &settings)?;
    replace_api(&app, &process)?;
    Ok(verification)
}

#[tauri::command]
fn qcafe_open_image_storage(app: AppHandle) -> Result<(), String> {
    let settings = load_or_configure_storage(&application_settings_dir(&app))?;
    let verification = verify_image_directory(&settings)?;
    #[cfg(target_os = "windows")]
    Command::new("explorer.exe")
        .arg(&verification.folder_path)
        .spawn()
        .map_err(|error| format!("Q Cafe could not open the image folder: {error}"))?;
    Ok(())
}

#[tauri::command]
fn qcafe_printer_service_status() -> PrinterServiceStatus {
    printer_service_status()
}

#[tauri::command]
fn qcafe_install_printer_service() -> Result<(), String> {
    if MessageDialog::new()
        .set_level(MessageLevel::Info)
        .set_title("Install Q Cafe Windows Print Service")
        .set_description("Q Cafe will install and start its Windows print service. Windows may ask for administrator approval. Continue?")
        .set_buttons(MessageButtons::YesNo)
        .show()
        != MessageDialogResult::Yes
    {
        return Ok(());
    }

    let service_binary = raw_print_service_binary()?;
    let script = raw_print_service_installer()?;
    let node = node_binary(&application_directory()?);
    if !node.is_file() {
        return Err("Q Cafe Node runtime is missing. Run the Q Cafe installer again.".to_string());
    }
    #[cfg(target_os = "windows")]
    {
        use windows_sys::Win32::UI::Shell::ShellExecuteW;
        use windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

        let node_wide = node
            .as_os_str()
            .encode_wide()
            .chain(Some(0))
            .collect::<Vec<_>>();
        let parameters = format!("\"{}\" \"{}\"", script.display(), service_binary.display());
        let parameters_wide = std::ffi::OsStr::new(&parameters)
            .encode_wide()
            .chain(Some(0))
            .collect::<Vec<_>>();
        let directory = application_directory()?;
        let directory_wide = directory
            .as_os_str()
            .encode_wide()
            .chain(Some(0))
            .collect::<Vec<_>>();
        let verb = "runas\0".encode_utf16().collect::<Vec<_>>();
        let result = unsafe {
            ShellExecuteW(
                std::ptr::null_mut(),
                verb.as_ptr(),
                node_wide.as_ptr(),
                parameters_wide.as_ptr(),
                directory_wide.as_ptr(),
                SW_SHOWNORMAL,
            )
        };
        if (result as isize) <= 32 {
            return Err("Windows did not start the Q Cafe Node service installer. Approve the administrator prompt and try again.".to_string());
        }
    }
    Ok(())
}

#[tauri::command]
fn qcafe_print_raw_receipt(request: RawReceiptRequest) -> Result<DirectPrintResult, String> {
    if request.receipt.trim().is_empty() || request.receipt.len() > 16_384 {
        return Err("Q Cafe could not prepare a valid receipt for direct printing.".to_string());
    }
    let status = printer_service_status();
    if !status.spooler_running {
        return Err("Windows Print Spooler service is stopped. Start the Print Spooler service and try again.".to_string());
    }
    if !status.service_installed {
        return Err("The Q Cafe Windows Print Service is not installed. Install it from Printer & Receipts Settings.".to_string());
    }
    if !status.service_running {
        return Err("The Q Cafe Windows Print Service is not running. Repair it from Printer & Receipts Settings.".to_string());
    }

    let printer = match request.printer_name.as_deref() {
        Some(name) if !name.trim().is_empty() && name != "system-default" => name.to_string(),
        _ => status
            .default_printer
            .ok_or_else(|| "No Windows default printer is selected.".to_string())?,
    };
    let interactive_printer = status
        .printers
        .iter()
        .any(|candidate| candidate.name == printer && candidate.is_interactive);

    #[cfg(target_os = "windows")]
    {
        if interactive_printer {
            return print_interactive_receipt(printer, request.document_name, request.receipt);
        }
        return send_raw_receipt_to_service(printer, request.document_name, request.receipt);
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Direct printing is only supported on Windows.".to_string())
    }
}

#[cfg(target_os = "windows")]
fn powershell_single_quoted(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

#[cfg(target_os = "windows")]
fn print_interactive_receipt(
    printer: String,
    document_name: String,
    receipt: String,
) -> Result<DirectPrintResult, String> {
    let directory = env::temp_dir().join("Q Cafe").join("print-jobs");
    fs::create_dir_all(&directory)
        .map_err(|error| format!("Q Cafe could not prepare the PDF print job: {error}"))?;
    let request_id = Uuid::new_v4();
    let content_path = directory.join(format!("{request_id}.txt"));
    fs::write(&content_path, receipt)
        .map_err(|error| format!("Q Cafe could not prepare the PDF receipt: {error}"))?;

    let script = format!(
        "$ErrorActionPreference='Stop'\n\
         $content=Get-Content -LiteralPath {content_path} -Raw -Encoding UTF8\n\
         Add-Type -AssemblyName System.Drawing\n\
         $document=New-Object System.Drawing.Printing.PrintDocument\n\
         $document.DocumentName={document_name}\n\
         $document.PrinterSettings.PrinterName={printer}\n\
         if (!$document.PrinterSettings.IsValid) {{ throw 'The selected Windows printer is unavailable.' }}\n\
         $document.DefaultPageSettings.Margins=New-Object System.Drawing.Printing.Margins(20,20,20,20)\n\
         $document.add_PrintPage({{ param($sender,$event) \
           $font=New-Object System.Drawing.Font('Consolas',9); \
           $format=New-Object System.Drawing.StringFormat; \
           $format.FormatFlags=[System.Drawing.StringFormatFlags]::MeasureTrailingSpaces; \
           $lineHeight=[Math]::Ceiling($font.GetHeight($event.Graphics)); \
           $y=20; \
           foreach($line in ($content -split \"`r?`n\")) {{ $event.Graphics.DrawString($line,$font,[System.Drawing.Brushes]::Black,20,$y,$format); $y+=$lineHeight }}; \
           $event.HasMorePages=$false \
         }})\n\
         $document.Print()",
        content_path = powershell_single_quoted(&content_path.display().to_string()),
        document_name = powershell_single_quoted(&document_name),
        printer = powershell_single_quoted(&printer),
    );
    let output = Command::new("powershell.exe")
        .args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            &script,
        ])
        .creation_flags(0x08000000)
        .output()
        .map_err(|error| format!("Q Cafe could not open the Windows PDF save dialog: {error}"))?;
    let _ = fs::remove_file(&content_path);
    if !output.status.success() {
        let message = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if message.is_empty() {
            "Windows did not complete the PDF print request.".to_string()
        } else {
            message
        });
    }
    Ok(DirectPrintResult {
        queued: false,
        job_id: None,
        printer,
        message: "Windows opened the printer output dialog.".to_string(),
    })
}

#[cfg(target_os = "windows")]
fn send_raw_receipt_to_service(
    printer: String,
    document_name: String,
    receipt: String,
) -> Result<DirectPrintResult, String> {
    let address = PRINT_SERVICE_ADDRESS
        .parse()
        .map_err(|_| "The Q Cafe Windows Print Service address is invalid.".to_string())?;
    let mut stream =
        TcpStream::connect_timeout(&address, Duration::from_secs(3)).map_err(|_| {
            "Q Cafe could not reach the Windows Print Service. Repair the service and try again."
                .to_string()
        })?;
    stream
        .set_read_timeout(Some(Duration::from_secs(8)))
        .map_err(|_| {
            "Q Cafe could not configure the Windows Print Service connection.".to_string()
        })?;
    let payload = serde_json::to_vec(&RawPrintServiceRequest {
        printer_name: printer.clone(),
        document_name,
        receipt,
    })
    .map_err(|_| "Q Cafe could not prepare the raw receipt request.".to_string())?;
    stream
        .write_all(&payload)
        .and_then(|_| stream.write_all(b"\n"))
        .map_err(|_| {
            "Q Cafe could not send the receipt to the Windows Print Service.".to_string()
        })?;
    let mut response = String::new();
    stream.read_to_string(&mut response).map_err(|_| {
        "Q Cafe did not receive a print response from the Windows Print Service.".to_string()
    })?;
    let result =
        serde_json::from_str::<RawPrintServiceResponse>(response.trim()).map_err(|_| {
            "Q Cafe received an invalid print response from the Windows Print Service.".to_string()
        })?;
    if !result.ok {
        return Err(result.message);
    }
    Ok(DirectPrintResult {
        queued: true,
        job_id: result.job_id,
        printer,
        message: result.message,
    })
}

#[tauri::command]
fn qcafe_clear_first_time_data(
    app: AppHandle,
    process: tauri::State<'_, ApiProcess>,
) -> Result<bool, String> {
    if MessageDialog::new()
        .set_level(MessageLevel::Warning)
        .set_title("Start with empty Q Cafe data")
        .set_description(
            "This removes the current local database. Existing backups are kept. Continue?",
        )
        .set_buttons(MessageButtons::YesNo)
        .show()
        != MessageDialogResult::Yes
    {
        return Ok(false);
    }
    let settings_dir = application_settings_dir(&app);
    let mut settings = load_or_configure_storage(&settings_dir)?;
    stop_api(&process)?;
    let database = settings.data_directory.join("q-cafe.sqlite");
    for suffix in ["", "-wal", "-shm"] {
        let _ = fs::remove_file(format!("{}{}", database.display(), suffix));
    }
    settings.last_backup_date = None;
    save_storage_settings(&settings_dir, &settings)?;
    replace_api(&app, &process)?;
    Ok(true)
}

fn main() {
    tauri::Builder::default()
        .manage(ApiProcess(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            qcafe_check_for_update,
            qcafe_install_update,
            qcafe_exit_application,
            qcafe_select_data_directory,
            qcafe_clear_first_time_data,
            qcafe_verify_image_storage,
            qcafe_select_image_storage,
            qcafe_open_image_storage,
            qcafe_printer_service_status,
            qcafe_install_printer_service,
            qcafe_print_raw_receipt,
            qcafe_license_status,
            qcafe_reconnect_license,
            qcafe_activate_license,
            qcafe_skip_activation
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                return Ok(());
            }
            if let Ok(status) = license::license_status(&application_settings_dir(app.handle())) {
                if !status.activation_required {
                    let child = start_api(app.handle())?;
                    *app.state::<ApiProcess>()
                        .0
                        .lock()
                        .expect("API process lock") = Some(child);
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                return;
            }
            if !matches!(event, tauri::WindowEvent::Destroyed) {
                return;
            }
            let _ = stop_api(&window.app_handle().state::<ApiProcess>());
        })
        .run(tauri::generate_context!())
        .expect("Q Cafe Windows application failed");
}
