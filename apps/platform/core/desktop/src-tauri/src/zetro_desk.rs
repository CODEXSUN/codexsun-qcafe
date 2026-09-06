use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use std::{
    env, fs,
    net::{SocketAddr, TcpStream},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::Mutex,
    thread,
    time::{Duration, Instant},
};
use tauri::State;

const BRIDGE_URL: &str = "http://127.0.0.1:4161";
const BRIDGE_ADDRESS: &str = "127.0.0.1:4161";

pub struct LocalRuntime {
    child: Mutex<Option<Child>>,
}

impl LocalRuntime {
    pub fn new() -> Self {
        Self { child: Mutex::new(None) }
    }

    pub fn ensure_started(&self) -> Result<(), String> {
        if bridge_available() {
            return Ok(());
        }
        let mut child = self.child.lock().map_err(|_| "The local Zetro runtime lock is unavailable.".to_string())?;
        if child.as_mut().is_some_and(|process| process.try_wait().ok().flatten().is_none()) {
            return Ok(());
        }
        *child = Some(spawn_runtime()?);
        Ok(())
    }
}

impl Drop for LocalRuntime {
    fn drop(&mut self) {
        if let Ok(mut child) = self.child.lock() {
            if let Some(process) = child.as_mut() {
                stop_process_tree(process);
            }
        }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct BridgeState {
    bridge_token: String,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopSettings {
    repository_root: String,
    github_url: String,
    enabled_agent_ids: Vec<String>,
    default_agent_id: String,
    #[serde(default = "default_runtime_target")]
    runtime_target: String,
    #[serde(default)]
    vps_agent_url: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    vps_agent_token: Option<String>,
    #[serde(default)]
    has_vps_agent_token: bool,
}

#[tauri::command]
pub async fn zetro_desk_status(runtime: State<'_, LocalRuntime>) -> Result<Value, String> {
    let _ = runtime.ensure_started();
    let _ = wait_for_bridge(Duration::from_secs(12));
    Ok(request_with_timeout("GET", "/health", None, Duration::from_secs(3))
        .await
        .unwrap_or_else(|_| json!({ "status": "degraded", "agent": "offline", "coordinator": "offline" })))
}

#[tauri::command]
pub fn zetro_desk_settings() -> Result<Value, String> {
    serde_json::to_value(read_settings()?).map_err(|_| "Zetro Desk settings are invalid.".to_string())
}

#[tauri::command]
pub async fn zetro_desk_agents(runtime: State<'_, LocalRuntime>) -> Result<Value, String> {
    let _ = runtime.ensure_started();
    Ok(request_with_timeout("GET", "/api/v1/desktop/zetro/agents", None, Duration::from_secs(3))
        .await
        .unwrap_or_else(|_| json!([{
            "id": "zxa",
            "name": "ZXA",
            "duty": "Local Docker assistant with approved repository tools.",
            "skills": [],
            "configured": false,
            "runtimeStatus": "offline",
            "mode": "provider"
        }])))
}

#[tauri::command]
pub async fn zetro_desk_save_settings(settings: Value, runtime: State<'_, LocalRuntime>) -> Result<Value, String> {
    let mut settings: DesktopSettings = serde_json::from_value(settings)
        .map_err(|_| "Provide a local repository folder and GitHub URL.".to_string())?;
    let repository = PathBuf::from(settings.repository_root.trim());
    if !repository.is_dir() {
        return Err("Choose an existing local repository folder.".to_string());
    }
    settings.repository_root = repository
        .canonicalize()
        .unwrap_or(repository)
        .to_string_lossy()
        .into_owned();
    settings.github_url = settings.github_url.trim().to_string();
    if settings.enabled_agent_ids.is_empty() {
        return Err("Enable at least one local agent.".to_string());
    }
    if !settings.enabled_agent_ids.contains(&settings.default_agent_id) {
        settings.default_agent_id = settings.enabled_agent_ids[0].clone();
    }
    validate_runtime_settings(&settings)?;
    if let Some(token) = settings.vps_agent_token.as_ref().map(|value| value.trim()).filter(|value| !value.is_empty()) {
        crate::credentials::save_credential("zxa-vps".to_string(), token.to_string())?;
    }
    let stored_token = crate::credentials::read_credential("zxa-vps".to_string())?;
    settings.has_vps_agent_token = stored_token.is_some();
    settings.vps_agent_token = stored_token;
    let value = serde_json::to_value(&settings).map_err(|_| "Zetro Desk settings are invalid.".to_string())?;
    if let Ok(saved) = request_with_timeout("PUT", "/api/v1/desktop/zetro/settings", Some(value), Duration::from_secs(60)).await {
        return Ok(saved);
    }
    settings.vps_agent_token = None;
    write_settings(&settings)?;
    runtime.ensure_started()?;
    serde_json::to_value(settings).map_err(|_| "Zetro Desk settings are invalid.".to_string())
}

#[tauri::command]
pub fn zetro_desk_pick_project_folder() -> Result<Option<Value>, String> {
    let settings = read_settings()?;
    let root = PathBuf::from(settings.repository_root)
        .canonicalize()
        .map_err(|_| "Choose an existing repository root in Zetro properties first.".to_string())?;
    let apps = root.join("apps");
    let start = if apps.is_dir() { apps } else { root.clone() };
    let Some(selected) = rfd::FileDialog::new()
        .set_title("Choose project folder")
        .set_directory(start)
        .pick_folder()
    else {
        return Ok(None);
    };
    let selected = selected.canonicalize().map_err(|_| "The selected folder is unavailable.".to_string())?;
    let folder = relative_project_folder(&root, &selected)?;
    Ok(Some(json!({ "folder": folder, "absolutePath": selected.to_string_lossy() })))
}

#[tauri::command]
pub async fn zetro_desk_send_prompt(input: Value, runtime: State<'_, LocalRuntime>) -> Result<Value, String> {
    runtime.ensure_started()?;
    wait_for_bridge(Duration::from_secs(12))?;
    request("POST", "/api/v1/desktop/zetro/messages", Some(input)).await
}

#[tauri::command]
pub async fn zetro_desk_coordinator(input: Value, runtime: State<'_, LocalRuntime>) -> Result<Value, String> {
    runtime.ensure_started()?;
    wait_for_bridge(Duration::from_secs(12))?;
    request("POST", "/api/v1/desktop/zetro/coordinator", Some(input)).await
}

async fn request(method: &str, path: &str, payload: Option<Value>) -> Result<Value, String> {
    request_with_timeout(method, path, payload, Duration::from_secs(130)).await
}

async fn request_with_timeout(method: &str, path: &str, payload: Option<Value>, timeout: Duration) -> Result<Value, String> {
    let client = Client::builder().timeout(timeout).build().map_err(|_| "Desktop network client is unavailable.")?;
    let mut request = match method {
        "GET" => client.get(format!("{BRIDGE_URL}{path}")),
        "PUT" => client.put(format!("{BRIDGE_URL}{path}")),
        "POST" => client.post(format!("{BRIDGE_URL}{path}")),
        _ => return Err("Unsupported desktop bridge request.".into()),
    };
    if path != "/health" {
        request = request.header("x-zetro-desk-key", bridge_state()?.bridge_token);
    }
    if let Some(value) = payload {
        request = request.json(&value);
    }
    let response = request.send().await.map_err(|_| "Local Zetro runtime is offline.".to_string())?;
    let status = response.status();
    let text = response.text().await.map_err(|_| "Local Zetro Desk returned an unreadable response.".to_string())?;
    let value: Value = serde_json::from_str(&text).unwrap_or_else(|_| json!({ "error": "Local Zetro Desk returned an invalid response." }));
    if !status.is_success() {
        return Err(value.get("error").and_then(Value::as_str).unwrap_or("Local Zetro Desk request failed.").to_string());
    }
    Ok(value)
}

fn read_settings() -> Result<DesktopSettings, String> {
    Ok(read_state().map(|state| settings_from_state(&state)).unwrap_or_else(|_| DesktopSettings {
        repository_root: env::var("ZETRO_PROJECTS_ROOT").unwrap_or_default(),
        github_url: String::new(),
        enabled_agent_ids: vec!["zxa".to_string()],
        default_agent_id: "zxa".to_string(),
        runtime_target: default_runtime_target(),
        vps_agent_url: String::new(),
        vps_agent_token: None,
        has_vps_agent_token: crate::credentials::read_credential("zxa-vps".to_string()).ok().flatten().is_some(),
    }))
}

pub fn selected_runtime_target() -> String {
    read_settings().map(|settings| settings.runtime_target).unwrap_or_else(|_| default_runtime_target())
}

fn write_settings(settings: &DesktopSettings) -> Result<(), String> {
    let path = state_path();
    let mut state = read_state().unwrap_or_else(|_| Value::Object(Map::new()));
    apply_settings(&mut state, settings);
    let parent = path.parent().ok_or_else(|| "Zetro Desk settings path is invalid.".to_string())?;
    fs::create_dir_all(parent).map_err(|_| "Zetro Desk settings folder could not be created.".to_string())?;
    let temporary_path = path.with_extension("json.tmp");
    let content = serde_json::to_vec_pretty(&state).map_err(|_| "Zetro Desk settings are invalid.".to_string())?;
    fs::write(&temporary_path, content).map_err(|_| "Zetro Desk settings could not be saved.".to_string())?;
    fs::rename(&temporary_path, &path).map_err(|_| "Zetro Desk settings could not be replaced.".to_string())
}

fn read_state() -> Result<Value, String> {
    let text = fs::read_to_string(state_path()).map_err(|_| "Zetro Desk has no saved properties yet.".to_string())?;
    serde_json::from_str(&text).map_err(|_| "Zetro Desk configuration is invalid.".to_string())
}

fn settings_from_state(state: &Value) -> DesktopSettings {
    let enabled_agent_ids = state.get("enabledAgentIds")
        .and_then(Value::as_array)
        .map(|items| items.iter().filter_map(Value::as_str).map(str::to_string).collect::<Vec<_>>())
        .filter(|items| !items.is_empty())
        .unwrap_or_else(|| vec!["zxa".to_string()]);
    let requested_default = state.get("defaultAgentId").and_then(Value::as_str).unwrap_or("zxa").to_string();
    let default_agent_id = if enabled_agent_ids.contains(&requested_default) { requested_default } else { enabled_agent_ids[0].clone() };
    DesktopSettings {
        repository_root: state.get("repositoryRoot").and_then(Value::as_str).unwrap_or("").to_string(),
        github_url: state.get("githubUrl").and_then(Value::as_str).unwrap_or("").to_string(),
        enabled_agent_ids,
        default_agent_id,
        runtime_target: state.get("runtimeTarget").and_then(Value::as_str).unwrap_or("docker-local").to_string(),
        vps_agent_url: state.get("vpsAgentUrl").and_then(Value::as_str).unwrap_or("").to_string(),
        vps_agent_token: None,
        has_vps_agent_token: crate::credentials::read_credential("zxa-vps".to_string()).ok().flatten().is_some(),
    }
}

fn apply_settings(state: &mut Value, settings: &DesktopSettings) {
    if !state.is_object() {
        *state = Value::Object(Map::new());
    }
    let object = state.as_object_mut().expect("state was normalized to an object");
    object.insert("repositoryRoot".to_string(), json!(settings.repository_root));
    object.insert("githubUrl".to_string(), json!(settings.github_url));
    object.insert("enabledAgentIds".to_string(), json!(settings.enabled_agent_ids));
    object.insert("defaultAgentId".to_string(), json!(settings.default_agent_id));
    object.insert("runtimeTarget".to_string(), json!(settings.runtime_target));
    object.insert("vpsAgentUrl".to_string(), json!(settings.vps_agent_url));
}

fn bridge_state() -> Result<BridgeState, String> {
    let text = fs::read_to_string(state_path()).map_err(|_| "Local Zetro runtime is not configured.".to_string())?;
    serde_json::from_str(&text).map_err(|_| "Local Zetro runtime configuration is invalid.".to_string())
}

fn state_path() -> PathBuf {
    env::var_os("CODEXSUN_ZETRO_DESK_STATE")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(env::var_os("APPDATA").unwrap_or_default()).join("CODEXSUN").join("zetro-desk-bridge.json"))
}

fn spawn_runtime() -> Result<Child, String> {
    let settings = read_settings()?;
    let repository = PathBuf::from(settings.repository_root);
    let script = repository.join("packages/zetro/local-runner/src/desktop-bridge.mjs");
    if !script.is_file() {
        return Err("The selected repository does not contain the Zetro Desk runtime.".to_string());
    }
    let mut command = Command::new(node_executable());
    command
        .arg(script)
        .current_dir(&repository)
        .env("CODEXSUN_DESKTOP_PARENT_PID", std::process::id().to_string())
        .env("ZETRO_WORKSPACE_ROOT", &repository)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    if let Ok(Some(token)) = crate::credentials::read_credential("zxa-vps".to_string()) {
        command.env("ZXA_VPS_TOKEN", token);
    }
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    command.spawn().map_err(|_| "Zetro Desk could not start its local runtime. Install Node.js and verify the repository root.".to_string())
}

#[cfg(windows)]
fn stop_process_tree(process: &mut Child) {
    let mut command = Command::new("taskkill");
    command
        .args(["/PID", &process.id().to_string(), "/T", "/F"])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    use std::os::windows::process::CommandExt;
    command.creation_flags(0x08000000);
    let _ = command.status();
}

#[cfg(not(windows))]
fn stop_process_tree(process: &mut Child) {
    let _ = process.kill();
}

fn node_executable() -> PathBuf {
    let installed = env::var_os("ProgramFiles")
        .map(PathBuf::from)
        .map(|folder| folder.join("nodejs/node.exe"));
    installed.filter(|path| path.is_file()).unwrap_or_else(|| PathBuf::from("node"))
}

fn bridge_available() -> bool {
    let Ok(address) = BRIDGE_ADDRESS.parse::<SocketAddr>() else { return false; };
    TcpStream::connect_timeout(&address, Duration::from_millis(150)).is_ok()
}

fn wait_for_bridge(timeout: Duration) -> Result<(), String> {
    let deadline = Instant::now() + timeout;
    while Instant::now() < deadline {
        if bridge_available() {
            return Ok(());
        }
        thread::sleep(Duration::from_millis(200));
    }
    Err("The local Zetro runtime did not become ready. Check the repository root and Node.js installation.".to_string())
}

fn relative_project_folder(root: &Path, selected: &Path) -> Result<String, String> {
    let relative = selected.strip_prefix(root)
        .map_err(|_| "Choose a project folder inside the configured repository root.".to_string())?;
    let folder = relative.components()
        .map(|component| component.as_os_str().to_string_lossy())
        .collect::<Vec<_>>()
        .join("/");
    Ok(if folder.is_empty() { ".".to_string() } else { folder })
}

fn default_runtime_target() -> String {
    "docker-local".to_string()
}

fn validate_runtime_settings(settings: &DesktopSettings) -> Result<(), String> {
    if !["local", "docker-local", "docker-vps"].contains(&settings.runtime_target.as_str()) {
        return Err("Choose Local CLI, Local Docker, or VPS Docker.".to_string());
    }
    if settings.runtime_target == "docker-vps" {
        let url = reqwest::Url::parse(settings.vps_agent_url.trim())
            .map_err(|_| "Enter the public HTTPS URL for the VPS ZXA container.".to_string())?;
        if url.scheme() != "https" {
            return Err("The VPS ZXA URL must use HTTPS.".to_string());
        }
        if !settings.has_vps_agent_token && settings.vps_agent_token.as_deref().unwrap_or("").trim().is_empty() {
            return Err("Enter the VPS ZXA access token.".to_string());
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn settings_use_durable_state_without_exposing_runtime_secrets() {
        let state = json!({
            "repositoryRoot": "E:\\Workspace\\codexsun",
            "githubUrl": "https://github.com/CODEXSUN/codexsun.git",
            "bridgeToken": "private"
        });
        let output = serde_json::to_value(settings_from_state(&state)).unwrap();
        assert_eq!(output["repositoryRoot"], "E:\\Workspace\\codexsun");
        assert_eq!(output["enabledAgentIds"], json!(["zxa"]));
        assert!(output.get("bridgeToken").is_none());
    }

    #[test]
    fn saving_settings_preserves_runtime_state() {
        let mut state = json!({ "bridgeToken": "private", "toolsToken": "private-tools" });
        let settings = DesktopSettings {
            repository_root: "E:\\Workspace\\codexsun".to_string(),
            github_url: "https://github.com/CODEXSUN/codexsun.git".to_string(),
            enabled_agent_ids: vec!["zxa".to_string()],
            default_agent_id: "zxa".to_string(),
            runtime_target: "docker-local".to_string(),
            vps_agent_url: String::new(),
            vps_agent_token: None,
            has_vps_agent_token: false,
        };
        apply_settings(&mut state, &settings);
        assert_eq!(state["bridgeToken"], "private");
        assert_eq!(state["repositoryRoot"], "E:\\Workspace\\codexsun");
        assert_eq!(state["runtimeTarget"], "docker-local");
    }

    #[test]
    fn selected_project_folder_is_stored_relative_to_repository() {
        let root = Path::new("E:/Workspace/codexsun");
        let selected = Path::new("E:/Workspace/codexsun/apps/q-cafe");
        assert_eq!(relative_project_folder(root, selected).unwrap(), "apps/q-cafe");
        assert!(relative_project_folder(root, Path::new("E:/Workspace/another-app")).is_err());
    }
}
