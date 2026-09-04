use std::{env, fs, path::PathBuf, process::{Child, Command}, sync::Mutex};
use tauri::{AppHandle, Manager};

struct ApiProcess(Mutex<Option<Child>>);

fn application_data_dir(app: &AppHandle) -> PathBuf {
    app.path().app_data_dir().expect("Windows application data directory is available")
}

fn node_binary(resource_dir: &PathBuf) -> PathBuf {
    if let Some(path) = env::var_os("QCAFE_NODE_BINARY") {
        return PathBuf::from(path);
    }

    resource_dir.join("node.exe")
}

fn start_api(app: &AppHandle) -> Result<Child, String> {
    let data_dir = application_data_dir(app);
    fs::create_dir_all(&data_dir).map_err(|error| error.to_string())?;
    let resource_dir = app.path().resource_dir().map_err(|error| error.to_string())?;
    let api_root = resource_dir.join("api");
    let database_path = data_dir.join("q-cafe.sqlite");
    let node = node_binary(&resource_dir);
    if !node.is_file() {
        return Err(format!("Q Cafe Node runtime is missing: {}", node.display()));
    }

    Command::new(node)
        .arg(api_root.join("src").join("server.mjs"))
        .current_dir(&api_root)
        .env("QCAFE_DATABASE_PATH", database_path)
        .env("QCAFE_API_PORT", "4180")
        .env("QCAFE_DEMO", env::var("QCAFE_DEMO").unwrap_or_else(|_| "true".to_string()))
        .env("QCAFE_API_TOKEN", "desktop-local-operator")
        .env("QCAFE_CASHIER_PIN", env::var("QCAFE_CASHIER_PIN").unwrap_or_else(|_| "1234".to_string()))
        .spawn()
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
