use reqwest::Client;
use serde::Deserialize;
use serde_json::{json, Value};
use std::{env, fs, path::PathBuf, time::Duration};

const BRIDGE_URL: &str = "http://127.0.0.1:4161";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct BridgeState {
    bridge_token: String,
}

#[tauri::command]
pub async fn zetro_desk_status() -> Result<Value, String> { request("GET", "/health", None).await }

#[tauri::command]
pub async fn zetro_desk_settings() -> Result<Value, String> { request("GET", "/api/v1/desktop/zetro/settings", None).await }

#[tauri::command]
pub async fn zetro_desk_agents() -> Result<Value, String> { request("GET", "/api/v1/desktop/zetro/agents", None).await }

#[tauri::command]
pub async fn zetro_desk_save_settings(settings: Value) -> Result<Value, String> {
    request("PUT", "/api/v1/desktop/zetro/settings", Some(settings)).await
}

#[tauri::command]
pub async fn zetro_desk_send_prompt(input: Value) -> Result<Value, String> {
    request("POST", "/api/v1/desktop/zetro/messages", Some(input)).await
}

async fn request(method: &str, path: &str, payload: Option<Value>) -> Result<Value, String> {
    let client = Client::builder().timeout(Duration::from_secs(130)).build().map_err(|_| "Desktop network client is unavailable.")?;
    let mut request = match method {
        "GET" => client.get(format!("{BRIDGE_URL}{path}")),
        "PUT" => client.put(format!("{BRIDGE_URL}{path}")),
        "POST" => client.post(format!("{BRIDGE_URL}{path}")),
        _ => return Err("Unsupported desktop bridge request.".into()),
    };
    if path != "/health" { request = request.header("x-zetro-desk-key", bridge_state()?.bridge_token); }
    if let Some(value) = payload { request = request.json(&value); }
    let response = request.send().await.map_err(|_| "Local Zetro Desk is not running. Run npm.cmd run zetro:desk from the CODEXSUN repository.".to_string())?;
    let status = response.status();
    let text = response.text().await.map_err(|_| "Local Zetro Desk returned an unreadable response.".to_string())?;
    let value: Value = serde_json::from_str(&text).unwrap_or_else(|_| json!({ "error": "Local Zetro Desk returned an invalid response." }));
    if !status.is_success() { return Err(value.get("error").and_then(Value::as_str).unwrap_or("Local Zetro Desk request failed.").to_string()); }
    Ok(value)
}

fn bridge_state() -> Result<BridgeState, String> {
    let path = env::var_os("CODEXSUN_ZETRO_DESK_STATE")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(env::var_os("APPDATA").unwrap_or_default()).join("CODEXSUN").join("zetro-desk-bridge.json"));
    let text = fs::read_to_string(path).map_err(|_| "Local Zetro Desk is not configured. Run npm.cmd run zetro:desk from the CODEXSUN repository.".to_string())?;
    serde_json::from_str(&text).map_err(|_| "Local Zetro Desk configuration is invalid.".to_string())
}
