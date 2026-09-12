#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use chrono::Local;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use rfd::{MessageButtons, MessageDialog, MessageDialogResult, MessageLevel};
use semver::Version;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{env, fs, io::Read, path::{Path, PathBuf}, process::{Child, Command, Stdio}, sync::Mutex, thread::sleep, time::Duration};
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use tauri::{AppHandle, Manager};
use uuid::Uuid;

struct ApiProcess(Mutex<Option<Child>>);

struct ServicesProcess(Mutex<Option<ServicesChild>>);

struct ServicesChild {
    child: Child,
    token: String,
}

#[derive(Deserialize, Serialize)]
struct ServicesCredentials {
    token: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ImageFolderStatus {
    ok: bool,
    folder_path: String,
    can_write: bool,
    message: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DemoImageImport {
    count: usize,
    folder_path: String,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct StorageSettings {
    backup_directory: PathBuf,
    data_directory: PathBuf,
    last_backup_date: Option<String>,
    schema_version: u8,
}

fn application_settings_dir(app: &AppHandle) -> PathBuf {
    app.path().app_data_dir().expect("Windows application data directory is available")
}

fn application_directory() -> Result<PathBuf, String> {
    let executable = env::current_exe().map_err(|error| error.to_string())?;
    executable.parent()
        .map(PathBuf::from)
        .ok_or_else(|| "Q Cafe application directory is unavailable.".to_string())
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

fn services_credentials_path(settings_dir: &Path) -> PathBuf {
    settings_dir.join("codexsun-services.json")
}

fn services_credentials(settings_dir: &Path) -> Result<ServicesCredentials, String> {
    let path = services_credentials_path(settings_dir);
    if path.is_file() {
        return serde_json::from_str(&fs::read_to_string(path).map_err(|error| error.to_string())?)
            .map_err(|error| format!("CODEXSUN Services credentials are invalid: {error}"));
    }
    let credentials = ServicesCredentials { token: Uuid::new_v4().to_string() };
    fs::write(&path, serde_json::to_string_pretty(&credentials).map_err(|error| error.to_string())?)
        .map_err(|error| error.to_string())?;
    Ok(credentials)
}

fn choose_data_directory() -> Result<PathBuf, String> {
    let default = env::var_os("USERPROFILE")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(r"C:\\"));
    rfd::FileDialog::new()
        .set_title("Choose Q Cafe data folder")
        .set_directory(&default)
        .pick_folder()
        .ok_or_else(|| "Q Cafe needs a data folder before it can start. Choose a folder and start Q Cafe again.".to_string())
}

fn validate_data_directory(path: &Path) -> Result<(), String> {
    if path.as_os_str().is_empty() || path.parent().is_none() {
        return Err("Choose a folder for Q Cafe data, not a drive root.".to_string());
    }
    fs::create_dir_all(path).map_err(|error| format!("Q Cafe data folder is unavailable: {error}"))?;
    let probe = path.join(".q-cafe-write-probe");
    fs::write(&probe, "ok").map_err(|error| format!("Q Cafe data folder is not writable: {error}"))?;
    fs::remove_file(probe).map_err(|error| format!("Q Cafe data folder cannot be verified: {error}"))
}

fn save_storage_settings(settings_dir: &Path, settings: &StorageSettings) -> Result<(), String> {
    fs::create_dir_all(settings_dir).map_err(|error| error.to_string())?;
    let contents = serde_json::to_string_pretty(settings).map_err(|error| error.to_string())?;
    fs::write(settings_path(settings_dir), contents).map_err(|error| error.to_string())
}

fn load_or_configure_storage(settings_dir: &Path) -> Result<StorageSettings, String> {
    let path = settings_path(settings_dir);
    let mut settings = if path.is_file() {
        serde_json::from_str::<StorageSettings>(&fs::read_to_string(&path).map_err(|error| error.to_string())?)
            .map_err(|error| format!("Q Cafe storage settings are invalid: {error}"))?
    } else {
        let data_directory = default_data_directory(settings_dir);
        StorageSettings {
            backup_directory: data_directory.join("backups"),
            data_directory,
            last_backup_date: None,
            schema_version: 1,
        }
    };
    if validate_data_directory(&settings.data_directory).is_err() {
        settings.data_directory = default_data_directory(settings_dir);
        settings.backup_directory = settings.data_directory.join("backups");
        settings.last_backup_date = None;
    }
    validate_data_directory(&settings.data_directory)?;
    fs::create_dir_all(&settings.backup_directory).map_err(|error| format!("Q Cafe backup folder is unavailable: {error}"))?;
    save_storage_settings(settings_dir, &settings)?;
    Ok(settings)
}

fn write_api_file(root: &PathBuf, relative_path: &str, contents: &str) -> Result<(), String> {
    let path = root.join(relative_path);
    let parent = path.parent().ok_or_else(|| format!("Q Cafe API path is invalid: {}", path.display()))?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    fs::write(path, contents).map_err(|error| error.to_string())
}

fn prepare_api_runtime(data_dir: &PathBuf) -> Result<PathBuf, String> {
    let api_root = data_dir.join("runtime").join("api");
    write_api_file(&api_root, "src/server.mjs", include_str!("../../../api/src/server.mjs"))?;
    write_api_file(&api_root, "src/store.mjs", include_str!("../../../api/src/store.mjs"))?;
    write_api_file(&api_root, "src/backup.mjs", include_str!("../../../api/src/backup.mjs"))?;
    write_api_file(&api_root, "src/staff-auth.mjs", include_str!("../../../api/src/staff-auth.mjs"))?;
    write_api_file(&api_root, "src/hardcoded-access.mjs", include_str!("../../../api/src/hardcoded-access.mjs"))?;
    write_api_file(&api_root, "migrations/001-restaurant.sql", include_str!("../../../api/migrations/001-restaurant.sql"))?;
    write_api_file(&api_root, "migrations/002-editable-order-lines.sql", include_str!("../../../api/migrations/002-editable-order-lines.sql"))?;
    write_api_file(&api_root, "migrations/003-sync-and-activity.sql", include_str!("../../../api/migrations/003-sync-and-activity.sql"))?;
    write_api_file(&api_root, "migrations/004-pos-billing.sql", include_str!("../../../api/migrations/004-pos-billing.sql"))?;
    write_api_file(&api_root, "migrations/005-staff-identity.sql", include_str!("../../../api/migrations/005-staff-identity.sql"))?;
    write_api_file(&api_root, "migrations/006-customer-menu-catalog.sql", include_str!("../../../api/migrations/006-customer-menu-catalog.sql"))?;
    write_api_file(&api_root, "migrations/007-numeric-menu-codes.sql", include_str!("../../../api/migrations/007-numeric-menu-codes.sql"))?;
    write_api_file(&api_root, "migrations/008-simple-pos-bill-numbers.sql", include_str!("../../../api/migrations/008-simple-pos-bill-numbers.sql"))?;
    Ok(api_root)
}

fn image_folder_path(folder_path: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(folder_path.trim());
    if folder_path.trim().is_empty() || !path.is_absolute() {
        return Err("Enter an absolute Windows or network image folder path.".to_string());
    }
    Ok(path)
}

fn verify_image_folder(folder_path: &str, write_protected: bool) -> Result<ImageFolderStatus, String> {
    let path = image_folder_path(folder_path)?;
    fs::create_dir_all(&path).map_err(|error| format!("Q Cafe could not create the image folder: {error}"))?;
    let probe = path.join(".q-cafe-write-check");
    fs::write(&probe, b"Q Cafe image folder check")
        .map_err(|error| format!("Q Cafe cannot write to this image folder: {error}"))?;
    fs::remove_file(&probe).map_err(|error| format!("Q Cafe could not finish the image folder check: {error}"))?;
    Ok(ImageFolderStatus {
        ok: true,
        folder_path: path.display().to_string(),
        can_write: !write_protected,
        message: if write_protected {
            "Folder is available. Q Cafe will keep existing image files protected.".to_string()
        } else {
            "Folder is available and ready for image files.".to_string()
        },
    })
}

fn copy_directory(source: &Path, destination: &Path) -> Result<usize, String> {
    fs::create_dir_all(destination).map_err(|error| error.to_string())?;
    let mut copied = 0;
    for entry in fs::read_dir(source).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let target = destination.join(entry.file_name());
        if entry.file_type().map_err(|error| error.to_string())?.is_dir() {
            copied += copy_directory(&entry.path(), &target)?;
        } else {
            fs::copy(entry.path(), target).map_err(|error| error.to_string())?;
            copied += 1;
        }
    }
    Ok(copied)
}

fn item_image_file_name(item_code: &str) -> Result<String, String> {
    let name: String = item_code.chars()
        .filter(|character| character.is_ascii_alphanumeric() || *character == '-' || *character == '_')
        .collect();
    if name.is_empty() {
        return Err("Item code must contain a letter or number before its image can be saved.".to_string());
    }
    Ok(format!("{name}.jpg"))
}

fn image_bytes(image_data: &str) -> Result<Vec<u8>, String> {
    let (_, encoded) = image_data.split_once(",").ok_or_else(|| "Item image data is invalid.".to_string())?;
    BASE64.decode(encoded).map_err(|error| format!("Item image data could not be decoded: {error}"))
}

fn prepare_services_runtime(settings_dir: &Path) -> Result<PathBuf, String> {
    let services_root = settings_dir.join("runtime").join("codexsun-services");
    write_api_file(
        &services_root,
        "server.mjs",
        include_str!("../../../../../packages/codexsun-services/src/server.mjs"),
    )?;
    Ok(services_root)
}

fn wait_for_api(child: &mut Child, api_log: &Path) -> Result<(), String> {
    for _ in 0..30 {
        if let Some(status) = child.try_wait().map_err(|error| error.to_string())? {
            return Err(format!("Q Cafe local service stopped during startup ({status}). Review {}.", api_log.display()));
        }
        if reqwest::blocking::get("http://127.0.0.1:4180/health")
            .ok()
            .and_then(|response| response.error_for_status().ok())
            .is_some() {
            return Ok(());
        }
        sleep(Duration::from_millis(100));
    }
    let _ = child.kill();
    Err(format!("Q Cafe local service did not start. Review {} and reopen Q Cafe.", api_log.display()))
}

fn backup_database(node: &Path, api_root: &Path, database_path: &Path, backup_directory: &Path) -> Result<(), String> {
    if !database_path.is_file() { return Ok(()); }
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
    if !status.success() { return Err("Q Cafe database backup failed. Your data was not changed.".to_string()); }
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
    env::var("QCAFE_UPDATE_MANIFEST_URL").unwrap_or_else(|_| "https://github.com/CODEXSUN/codexsun-qcafe/releases/latest/download/qcafe-update.json".to_string())
}

fn check_for_update() -> Result<Option<UpdateManifest>, String> {
    let response = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(12))
        .user_agent("Q-Cafe-Desktop")
        .build().map_err(|error| error.to_string())?
        .get(update_manifest_url())
        .send().map_err(|error| error.to_string())?
        .error_for_status().map_err(|error| error.to_string())?;
    let update = response.json::<UpdateManifest>().map_err(|error| error.to_string())?;
    let current = Version::parse(env!("CARGO_PKG_VERSION")).map_err(|error| error.to_string())?;
    let available = Version::parse(&update.version).map_err(|error| format!("Q Cafe update version is invalid: {error}"))?;
    Ok((update.stable && available > current).then_some(update))
}

fn sha256_file(path: &Path) -> Result<String, String> {
    let mut file = fs::File::open(path).map_err(|error| error.to_string())?;
    let mut hasher = Sha256::new();
    let mut buffer = [0; 64 * 1024];
    loop {
        let read = file.read(&mut buffer).map_err(|error| error.to_string())?;
        if read == 0 { break; }
        hasher.update(&buffer[..read]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}

fn download_verified_installer(update: &UpdateManifest) -> Result<PathBuf, String> {
    if !update.installer.url.starts_with("https://") { return Err("Q Cafe update download must use HTTPS.".to_string()); }
    let directory = env::temp_dir().join("Q Cafe Updates").join(&update.version);
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    let installer = directory.join("qcafe-update-setup.exe");
    let response = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(120))
        .user_agent("Q-Cafe-Desktop")
        .build().map_err(|error| error.to_string())?
        .get(&update.installer.url)
        .send().map_err(|error| error.to_string())?
        .error_for_status().map_err(|error| error.to_string())?;
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
    let result = Command::new(installer).arg("/S").creation_flags(0x08000000).spawn();
    #[cfg(not(target_os = "windows"))]
    let result = Command::new(installer).spawn();
    result.map(|_| ()).map_err(|_| "The verified installer could not start.".to_string())
}

fn request_api_shutdown() {
    let _ = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(2))
        .build()
        .and_then(|client| client.post("http://127.0.0.1:4180/internal/shutdown").header("Authorization", "Bearer desktop-local-operator").send())
        .and_then(|response| response.error_for_status());
}

fn wait_for_services(child: &mut Child, services_log: &Path) -> Result<(), String> {
    for _ in 0..30 {
        if let Some(status) = child.try_wait().map_err(|error| error.to_string())? {
            return Err(format!("CODEXSUN Services stopped during startup ({status}). Review {}.", services_log.display()));
        }
        if reqwest::blocking::get("http://127.0.0.1:4181/health")
            .ok()
            .and_then(|response| response.error_for_status().ok())
            .is_some() {
            return Ok(());
        }
        sleep(Duration::from_millis(100));
    }
    let _ = child.kill();
    Err(format!("CODEXSUN Services did not start. Review {} and reopen Q Cafe.", services_log.display()))
}

fn stop_api(process: &ApiProcess) -> Result<(), String> {
    let mut child = match process.0.lock().map_err(|_| "Q Cafe API process lock failed.")?.take() {
        Some(child) => child,
        None => return Ok(()),
    };
    request_api_shutdown();
    for _ in 0..50 {
        if child.try_wait().map_err(|error| format!("Q Cafe local service could not stop: {error}"))?.is_some() {
            return Ok(());
        }
        sleep(Duration::from_millis(100));
    }
    child.kill().map_err(|error| format!("Q Cafe local service could not stop: {error}"))?;
    let _ = child.wait();
    Ok(())
}

fn start_services(app: &AppHandle) -> Result<ServicesChild, String> {
    let settings_dir = application_settings_dir(app);
    fs::create_dir_all(&settings_dir).map_err(|error| error.to_string())?;
    let credentials = services_credentials(&settings_dir)?;
    let services_root = prepare_services_runtime(&settings_dir)?;
    let services_data = settings_dir.join("codexsun-services");
    fs::create_dir_all(&services_data).map_err(|error| error.to_string())?;
    let log_path = services_data.join("services.log");
    let log = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .map_err(|error| format!("CODEXSUN Services log could not open: {error}"))?;
    let node = node_binary(&application_directory()?);
    if !node.is_file() {
        return Err(format!("CODEXSUN Services Node runtime is missing: {}", node.display()));
    }
    let mut command = Command::new(node);
    command
        .arg(services_root.join("server.mjs"))
        .current_dir(&services_root)
        .env("CODEXSUN_SERVICES_PORT", "4181")
        .env("CODEXSUN_SERVICES_TOKEN", &credentials.token)
        .env("CODEXSUN_SERVICES_DATA_DIR", &services_data)
        .stdout(Stdio::from(log.try_clone().map_err(|error| error.to_string())?))
        .stderr(Stdio::from(log));
    #[cfg(target_os = "windows")]
    command.creation_flags(0x08000000);
    let mut child = command.spawn()
        .map_err(|error| format!("CODEXSUN Services could not start: {error}"))?;
    wait_for_services(&mut child, &log_path)?;
    Ok(ServicesChild { child, token: credentials.token })
}

fn stop_services(process: &ServicesProcess) -> Result<(), String> {
    let mut services = match process.0.lock().map_err(|_| "CODEXSUN Services process lock failed.")?.take() {
        Some(services) => services,
        None => return Ok(()),
    };
    let _ = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(2))
        .build()
        .and_then(|client| client.post("http://127.0.0.1:4181/internal/shutdown").bearer_auth(&services.token).send())
        .and_then(|response| response.error_for_status());
    for _ in 0..50 {
        if services.child.try_wait().map_err(|error| format!("CODEXSUN Services could not stop: {error}"))?.is_some() {
            return Ok(());
        }
        sleep(Duration::from_millis(100));
    }
    services.child.kill().map_err(|error| format!("CODEXSUN Services could not stop: {error}"))?;
    let _ = services.child.wait();
    Ok(())
}

fn services_request(process: &ServicesProcess, path: &str, body: serde_json::Value) -> Result<serde_json::Value, String> {
    let token = process.0.lock()
        .map_err(|_| "CODEXSUN Services process lock failed.")?
        .as_ref()
        .ok_or_else(|| "CODEXSUN Services is unavailable. Reopen Q Cafe.".to_string())?
        .token
        .clone();
    let response = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(15))
        .build().map_err(|error| error.to_string())?
        .post(format!("http://127.0.0.1:4181{path}"))
        .bearer_auth(token)
        .json(&body)
        .send().map_err(|error| format!("CODEXSUN Services is unavailable: {error}"))?;
    let status = response.status();
    let payload = response.json::<serde_json::Value>().map_err(|error| error.to_string())?;
    if !status.is_success() {
        return Err(payload.get("error").and_then(|value| value.as_str()).unwrap_or("CODEXSUN Services request failed.").to_string());
    }
    Ok(payload)
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
fn qcafe_exit_application(app: AppHandle, process: tauri::State<'_, ApiProcess>, services: tauri::State<'_, ServicesProcess>) -> Result<(), String> {
    stop_services(&services)?;
    stop_api(&process)?;
    app.exit(0);
    Ok(())
}

#[tauri::command]
fn qcafe_print_receipt(
    id: String,
    title: String,
    content: String,
    receipt: serde_json::Value,
    services: tauri::State<'_, ServicesProcess>,
) -> Result<serde_json::Value, String> {
    services_request(&services, "/v1/print-jobs", serde_json::json!({ "id": id, "title": title, "content": content, "receipt": receipt }))
}

#[tauri::command]
fn qcafe_list_printers(services: tauri::State<'_, ServicesProcess>) -> Result<serde_json::Value, String> {
    services_request(&services, "/v1/printers/list", serde_json::json!({}))
}

#[tauri::command]
fn qcafe_configure_printer(
    name: String,
    mode: String,
    services: tauri::State<'_, ServicesProcess>,
) -> Result<serde_json::Value, String> {
    services_request(&services, "/v1/printers/configure", serde_json::json!({ "name": name, "mode": mode }))
}

#[tauri::command]
fn qcafe_smoke_test_printer(services: tauri::State<'_, ServicesProcess>) -> Result<serde_json::Value, String> {
    services_request(&services, "/v1/printers/smoke", serde_json::json!({}))
}

#[tauri::command]
fn qcafe_test_print(services: tauri::State<'_, ServicesProcess>) -> Result<serde_json::Value, String> {
    services_request(&services, "/v1/printers/test-print", serde_json::json!({}))
}

#[tauri::command]
fn qcafe_configure_license(
    portal_url: String,
    license_key: String,
    services: tauri::State<'_, ServicesProcess>,
) -> Result<serde_json::Value, String> {
    services_request(&services, "/v1/license/configure", serde_json::json!({ "portalUrl": portal_url, "licenseKey": license_key, "productId": "q-cafe" }))
}

#[tauri::command]
fn qcafe_verify_license(services: tauri::State<'_, ServicesProcess>) -> Result<serde_json::Value, String> {
    services_request(&services, "/v1/license/verify", serde_json::json!({}))
}

#[tauri::command]
fn qcafe_verify_image_folder(folder_path: String, write_protected: bool) -> Result<ImageFolderStatus, String> {
    verify_image_folder(&folder_path, write_protected)
}

#[tauri::command]
fn qcafe_open_image_folder(folder_path: String) -> Result<(), String> {
    let folder = image_folder_path(&folder_path)?;
    if !folder.is_dir() {
        return Err("Verify the image folder before opening it.".to_string());
    }
    Command::new("explorer.exe")
        .arg(folder)
        .spawn()
        .map_err(|error| format!("Q Cafe could not open the image folder: {error}"))?;
    Ok(())
}

#[tauri::command]
fn qcafe_install_demo_images(app: AppHandle, folder_path: String, write_protected: bool) -> Result<DemoImageImport, String> {
    if write_protected {
        return Err("Turn off image write protection before installing demo images.".to_string());
    }
    let status = verify_image_folder(&folder_path, false)?;
    let source = app.path().resource_dir().map_err(|error| error.to_string())?.join("demo-images");
    if !source.is_dir() {
        return Err("The packaged demo images are unavailable. Reinstall Q Cafe.".to_string());
    }
    let destination = PathBuf::from(&status.folder_path).join("demo-images");
    let count = copy_directory(&source, &destination)?;
    Ok(DemoImageImport { count, folder_path: destination.display().to_string() })
}

#[tauri::command]
fn qcafe_store_item_image(folder_path: String, item_code: String, image_data: String, write_protected: bool) -> Result<String, String> {
    let status = verify_image_folder(&folder_path, write_protected)?;
    let destination = PathBuf::from(status.folder_path).join(item_image_file_name(&item_code)?);
    if write_protected && destination.is_file() {
        return Err("Image write protection is active for this item. Turn it off before replacing the image.".to_string());
    }
    let temporary = destination.with_extension("jpg.tmp");
    fs::write(&temporary, image_bytes(&image_data)?).map_err(|error| format!("Q Cafe could not save the item image: {error}"))?;
    fs::rename(&temporary, &destination).map_err(|error| format!("Q Cafe could not complete the item image save: {error}"))?;
    Ok(destination.display().to_string())
}

fn start_api(app: &AppHandle) -> Result<Child, String> {
    let settings_dir = application_settings_dir(app);
    let mut storage = load_or_configure_storage(&settings_dir)?;
    let api_root = prepare_api_runtime(&settings_dir)?;
    let database_path = storage.data_directory.join("q-cafe.sqlite");
    let node = node_binary(&application_directory()?);
    if !node.is_file() {
        return Err(format!("Q Cafe Node runtime is missing: {}", node.display()));
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
    let mut command = Command::new(node);
    command
        .arg(api_root.join("src").join("server.mjs"))
        .current_dir(&api_root)
        .env("QCAFE_DATABASE_PATH", database_path)
        .env("QCAFE_API_PORT", "4180")
        .env("QCAFE_DEMO", env::var("QCAFE_DEMO").unwrap_or_else(|_| "true".to_string()))
        .env("QCAFE_API_TOKEN", "desktop-local-operator")
        .env("QCAFE_BOOTSTRAP_OWNER_PIN", env::var("QCAFE_BOOTSTRAP_OWNER_PIN").unwrap_or_default())
        .stdout(Stdio::from(log.try_clone().map_err(|error| error.to_string())?))
        .stderr(Stdio::from(log));
    #[cfg(target_os = "windows")]
    command.creation_flags(0x08000000);
    let mut child = command.spawn()
        .map_err(|error| format!("Q Cafe API could not start: {error}"))?;
    wait_for_api(&mut child, &api_log)?;
    Ok(child)
}

fn replace_api(app: &AppHandle, process: &ApiProcess) -> Result<(), String> {
    stop_api(process)?;
    let child = start_api(app)?;
    *process.0.lock().map_err(|_| "Q Cafe API process lock failed.")? = Some(child);
    Ok(())
}

#[tauri::command]
fn qcafe_select_data_directory(app: AppHandle, process: tauri::State<'_, ApiProcess>) -> Result<String, String> {
    let settings_dir = application_settings_dir(&app);
    let data_directory = choose_data_directory()?;
    validate_data_directory(&data_directory)?;
    let settings = StorageSettings {
        backup_directory: data_directory.join("backups"),
        data_directory: data_directory.clone(),
        last_backup_date: None,
        schema_version: 1,
    };
    fs::create_dir_all(&settings.backup_directory).map_err(|error| error.to_string())?;
    save_storage_settings(&settings_dir, &settings)?;
    replace_api(&app, &process)?;
    Ok(data_directory.join("q-cafe.sqlite").display().to_string())
}

#[tauri::command]
fn qcafe_clear_first_time_data(app: AppHandle, process: tauri::State<'_, ApiProcess>) -> Result<bool, String> {
    if MessageDialog::new().set_level(MessageLevel::Warning).set_title("Start with empty Q Cafe data").set_description("This removes the current local database. Existing backups are kept. Continue?").set_buttons(MessageButtons::YesNo).show() != MessageDialogResult::Yes {
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
        .manage(ServicesProcess(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![qcafe_check_for_update, qcafe_install_update, qcafe_exit_application, qcafe_print_receipt, qcafe_list_printers, qcafe_configure_printer, qcafe_smoke_test_printer, qcafe_test_print, qcafe_configure_license, qcafe_verify_license, qcafe_verify_image_folder, qcafe_open_image_folder, qcafe_install_demo_images, qcafe_store_item_image, qcafe_select_data_directory, qcafe_clear_first_time_data])
        .setup(|app| {
            if cfg!(debug_assertions) {
                return Ok(());
            }
            if let Ok(services) = start_services(app.handle()) {
                *app.state::<ServicesProcess>().0.lock().expect("CODEXSUN Services process lock") = Some(services);
            }
            let child = start_api(app.handle())?;
            *app.state::<ApiProcess>().0.lock().expect("API process lock") = Some(child);
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                return;
            }
            if !matches!(event, tauri::WindowEvent::Destroyed) { return; }
            let _ = stop_services(&window.app_handle().state::<ServicesProcess>());
            let _ = stop_api(&window.app_handle().state::<ApiProcess>());
        })
        .run(tauri::generate_context!())
        .expect("Q Cafe Windows application failed");
}
