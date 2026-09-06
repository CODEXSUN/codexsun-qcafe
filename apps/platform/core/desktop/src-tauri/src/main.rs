#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod credentials;
mod zetro_desk;

use serde::Serialize;
use std::{env, path::PathBuf};
use tauri::{AppHandle, Manager};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopStatus {
    app_data_directory: String,
    platform: &'static str,
    repository_root: Option<String>,
    node_api_url: String,
    zetro_api_url: String,
    agent_runtime: String,
}

#[tauri::command]
fn desktop_status(app: AppHandle) -> Result<DesktopStatus, String> {
    let app_data_directory = app.path().app_data_dir().map_err(|error| error.to_string())?;
    Ok(DesktopStatus {
        app_data_directory: display(app_data_directory),
        platform: env::consts::OS,
        repository_root: env::var_os("ZETRO_PROJECTS_ROOT").map(PathBuf::from).map(display),
        node_api_url: env::var("OS_DESKTOP_API_URL").unwrap_or_else(|_| "http://127.0.0.1:4100".to_string()),
        zetro_api_url: env::var("ZETRO_DESKTOP_API_URL").unwrap_or_else(|_| "http://127.0.0.1:4150".to_string()),
        agent_runtime: zetro_desk::selected_runtime_target(),
    })
}

fn display(path: PathBuf) -> String {
    path.to_string_lossy().replace('\\', "/")
}

fn main() {
    let runtime = zetro_desk::LocalRuntime::new();
    let _ = runtime.ensure_started();
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(runtime)
        .invoke_handler(tauri::generate_handler![desktop_status, credentials::read_credential, credentials::save_credential, credentials::delete_credential, zetro_desk::zetro_desk_status, zetro_desk::zetro_desk_settings, zetro_desk::zetro_desk_agents, zetro_desk::zetro_desk_save_settings, zetro_desk::zetro_desk_pick_project_folder, zetro_desk::zetro_desk_send_prompt, zetro_desk::zetro_desk_coordinator])
        .run(tauri::generate_context!())
        .expect("CODEXSUN desktop failed");
}
