#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use chrono::Local;
use rfd::{MessageButtons, MessageDialog, MessageDialogResult, MessageLevel};
use semver::Version;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{env, fs, io::Read, path::{Path, PathBuf}, process::{Child, Command, Stdio}, sync::Mutex, thread::sleep, time::Duration};
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use tauri::{AppHandle, Manager};

struct ApiProcess(Mutex<Option<Child>>);

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

fn default_data_directory() -> PathBuf { PathBuf::from(r"D:\Q Cafe Data") }

fn settings_path(settings_dir: &Path) -> PathBuf {
    settings_dir.join("settings.json")
}

fn choose_data_directory() -> Result<PathBuf, String> {
    let default = default_data_directory();
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
    if !path.to_string_lossy().to_ascii_lowercase().starts_with("d:\\") {
        return Err("Choose a Q Cafe data folder on the mapped D: drive.".to_string());
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
    let settings = if path.is_file() {
        serde_json::from_str::<StorageSettings>(&fs::read_to_string(&path).map_err(|error| error.to_string())?)
            .map_err(|error| format!("Q Cafe storage settings are invalid: {error}"))?
    } else {
        let data_directory = choose_data_directory()?;
        StorageSettings {
            backup_directory: data_directory.join("backups"),
            data_directory,
            last_backup_date: None,
            schema_version: 1,
        }
    };
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
    write_api_file(&api_root, "migrations/001-restaurant.sql", include_str!("../../../api/migrations/001-restaurant.sql"))?;
    write_api_file(&api_root, "migrations/002-editable-order-lines.sql", include_str!("../../../api/migrations/002-editable-order-lines.sql"))?;
    write_api_file(&api_root, "migrations/003-sync-and-activity.sql", include_str!("../../../api/migrations/003-sync-and-activity.sql"))?;
    write_api_file(&api_root, "migrations/004-pos-billing.sql", include_str!("../../../api/migrations/004-pos-billing.sql"))?;
    write_api_file(&api_root, "migrations/005-staff-identity.sql", include_str!("../../../api/migrations/005-staff-identity.sql"))?;
    Ok(api_root)
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
    env::var("QCAFE_UPDATE_MANIFEST_URL").unwrap_or_else(|_| "https://github.com/CODEXSUN/codexsun/releases/latest/download/qcafe-update.json".to_string())
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

fn stop_api(process: &ApiProcess) -> Result<(), String> {
    if let Some(mut child) = process.0.lock().map_err(|_| "Q Cafe API process lock failed.")?.take() {
        child.kill().map_err(|error| format!("Q Cafe local service could not stop: {error}"))?;
        let _ = child.wait();
    }
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
        .invoke_handler(tauri::generate_handler![qcafe_check_for_update, qcafe_install_update, qcafe_select_data_directory, qcafe_clear_first_time_data])
        .setup(|app| {
            if cfg!(debug_assertions) {
                return Ok(());
            }
            let child = start_api(app.handle())?;
            *app.state::<ApiProcess>().0.lock().expect("API process lock") = Some(child);
            Ok(())
        })
        .on_window_event(|window, event| {
            if !matches!(event, tauri::WindowEvent::Destroyed) { return; }
            if let Some(child) = window.app_handle().state::<ApiProcess>().0.lock().expect("API process lock").as_mut() {
                let _ = child.kill();
            }
        })
        .run(tauri::generate_context!())
        .expect("Q Cafe Windows application failed");
}
