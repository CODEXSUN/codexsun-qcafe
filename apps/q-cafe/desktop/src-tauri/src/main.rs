use std::{env, fs, path::PathBuf, process::{Child, Command}, sync::Mutex};
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use tauri::{AppHandle, Manager};

struct ApiProcess(Mutex<Option<Child>>);

fn application_data_dir(app: &AppHandle) -> PathBuf {
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
    write_api_file(&api_root, "migrations/001-restaurant.sql", include_str!("../../../api/migrations/001-restaurant.sql"))?;
    write_api_file(&api_root, "migrations/002-editable-order-lines.sql", include_str!("../../../api/migrations/002-editable-order-lines.sql"))?;
    write_api_file(&api_root, "migrations/003-sync-and-activity.sql", include_str!("../../../api/migrations/003-sync-and-activity.sql"))?;
    write_api_file(&api_root, "migrations/004-pos-billing.sql", include_str!("../../../api/migrations/004-pos-billing.sql"))?;
    Ok(api_root)
}

fn start_api(app: &AppHandle) -> Result<Child, String> {
    let data_dir = application_data_dir(app);
    fs::create_dir_all(&data_dir).map_err(|error| error.to_string())?;
    let api_root = prepare_api_runtime(&data_dir)?;
    let database_path = data_dir.join("q-cafe.sqlite");
    let node = node_binary(&application_directory()?);
    if !node.is_file() {
        return Err(format!("Q Cafe Node runtime is missing: {}", node.display()));
    }

    let mut command = Command::new(node);
    command
        .arg(api_root.join("src").join("server.mjs"))
        .current_dir(&api_root)
        .env("QCAFE_DATABASE_PATH", database_path)
        .env("QCAFE_API_PORT", "4180")
        .env("QCAFE_DEMO", env::var("QCAFE_DEMO").unwrap_or_else(|_| "true".to_string()))
        .env("QCAFE_API_TOKEN", "desktop-local-operator")
        .env("QCAFE_CASHIER_PIN", env::var("QCAFE_CASHIER_PIN").unwrap_or_else(|_| "1234".to_string()));
    #[cfg(target_os = "windows")]
    command.creation_flags(0x08000000);
    command.spawn()
        .map_err(|error| format!("Q Cafe API could not start: {error}"))
}

fn main() {
    tauri::Builder::default()
        .manage(ApiProcess(Mutex::new(None)))
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
