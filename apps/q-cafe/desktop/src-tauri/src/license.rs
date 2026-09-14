use keyring::Entry;
use reqwest::blocking::Client;
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use std::{env, fs, path::Path, thread::sleep, time::Duration};
use uuid::Uuid;

const APP_ID: &str = "qcafe-desktop";
const LICENSE_SERVICE: &str = "in.codexsun.qcafe";
const LICENSE_ACCOUNT: &str = "desktop-license-token";
const DEFAULT_SERVER_URL: &str = "https://secure.techmedia.in";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivationRequest {
    license_key: String,
    machine_label: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseStatus {
    pub licensed: bool,
    pub activation_required: bool,
    pub machine_id: String,
    pub machine_label: String,
    pub license_id: Option<String>,
    pub activated_at: Option<String>,
    pub serial_uuid: Option<String>,
    pub last_validated_at: Option<String>,
    pub offline: bool,
    pub message: String,
    pub activation_response: Option<ActivationResponseSummary>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivationResponseSummary {
    pub http_status: u16,
    pub status: String,
    pub license_id: String,
    pub app_id: String,
    pub activated_at: String,
    pub machine_limit: u8,
    pub token_stored: bool,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LicenseMetadata {
    machine_id: String,
    machine_label: String,
    license_id: Option<String>,
    activated_at: Option<String>,
    #[serde(default)]
    serial_uuid: Option<String>,
    #[serde(default)]
    last_validated_at: Option<String>,
    app_id: String,
    #[serde(default)]
    trial_mode: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ActivationResponse {
    status: String,
    license_token: String,
    license_id: String,
    app_id: String,
    activated_at: String,
    machine_limit: u8,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ValidationResponse {
    valid: bool,
    status: String,
    app_id: String,
}

#[derive(Deserialize)]
struct ServerError {
    error: Option<String>,
    code: Option<String>,
    message: Option<String>,
}

pub fn license_status(settings_dir: &Path) -> Result<LicenseStatus, String> {
    let metadata = load_or_create_metadata(settings_dir)?;
    if metadata.trial_mode {
        return Ok(status(
            &metadata,
            false,
            false,
            true,
            "Q Cafe is running in trial mode.",
        ));
    }
    match credential()?.get_password() {
        Ok(value) if !value.is_empty() => Ok(status(
            &metadata,
            true,
            false,
            true,
            "License is available locally. Reconnect when internet access is available.",
        )),
        Ok(_) | Err(keyring::Error::NoEntry) => Ok(status(
            &metadata,
            false,
            true,
            false,
            "Activate this Q Cafe installation to continue.",
        )),
        Err(_) => Err("Windows Credential Manager could not read the Q Cafe license.".to_string()),
    }
}

pub fn reconnect_license(settings_dir: &Path) -> Result<LicenseStatus, String> {
    let mut metadata = load_or_create_metadata(settings_dir)?;
    let token = credential()?
        .get_password()
        .map_err(|_| "No locally stored Q Cafe activation was found.".to_string())?;
    let mut status = validate(&metadata, &token)?;
    if status.licensed {
        let now = chrono::Utc::now().to_rfc3339();
        metadata.last_validated_at = Some(now.clone());
        save_metadata(settings_dir, &metadata)?;
        status.last_validated_at = Some(now);
        status.offline = false;
        status.message = "License reconnected and verified with Tech Media Secure.".to_string();
    }
    Ok(status)
}

pub fn activate_license(
    settings_dir: &Path,
    input: ActivationRequest,
) -> Result<LicenseStatus, String> {
    let mut metadata = load_or_create_metadata(settings_dir)?;
    let license_key = normalize_license_key(&input.license_key)?;
    metadata.machine_label = normalized_label(&input.machine_label)?;
    save_metadata(settings_dir, &metadata)?;

    let response = activate(&metadata, &license_key, false).or_else(|error| {
        if error == "LICENSE_STATE_CHANGED" {
            sleep(Duration::from_millis(500));
            activate(&metadata, &license_key, true)
        } else {
            Err(error)
        }
    })?;
    if response.status != "ACTIVE" || response.app_id != APP_ID || response.license_token.is_empty()
    {
        return Err("The license server returned an invalid activation response.".to_string());
    }
    credential()?
        .set_password(&response.license_token)
        .map_err(|_| "Windows Credential Manager could not save the Q Cafe license.".to_string())?;
    let stored_token = credential()?.get_password().map_err(|_| {
        "Windows Credential Manager could not verify the saved Q Cafe license.".to_string()
    })?;
    if stored_token != response.license_token {
        return Err(
            "Windows Credential Manager could not verify the saved Q Cafe license.".to_string(),
        );
    }
    metadata.license_id = Some(response.license_id.clone());
    metadata.serial_uuid = Some(response.license_id.clone());
    metadata.activated_at = Some(response.activated_at.clone());
    metadata.last_validated_at = Some(chrono::Utc::now().to_rfc3339());
    metadata.trial_mode = false;
    save_metadata(settings_dir, &metadata)?;
    let mut status = status(
        &metadata,
        true,
        false,
        false,
        "License verified and stored in Windows Credential Manager.",
    );
    status.activation_response = Some(ActivationResponseSummary {
        http_status: 200,
        status: response.status,
        license_id: response.license_id,
        app_id: response.app_id,
        activated_at: response.activated_at,
        machine_limit: response.machine_limit,
        token_stored: true,
    });
    Ok(status)
}

pub fn skip_activation(settings_dir: &Path) -> Result<LicenseStatus, String> {
    let mut metadata = load_or_create_metadata(settings_dir)?;
    clear_token()?;
    metadata.trial_mode = true;
    save_metadata(settings_dir, &metadata)?;
    Ok(status(
        &metadata,
        false,
        false,
        true,
        "Q Cafe is running in trial mode.",
    ))
}

fn validate(metadata: &LicenseMetadata, token: &str) -> Result<LicenseStatus, String> {
    let client = client()?;
    let response = client.post(format!("{}/api/v1/licenses/validate", server_url()?))
        .json(&serde_json::json!({ "appId": APP_ID, "licenseToken": token, "machineId": metadata.machine_id }))
        .send().map_err(|error| format!("Q Cafe could not connect to the license server: {error}"))?;
    if response.status() == StatusCode::OK {
        let payload = response
            .json::<ValidationResponse>()
            .map_err(|_| "The license server returned an invalid response.".to_string())?;
        if payload.valid && payload.status == "ACTIVE" && payload.app_id == APP_ID {
            return Ok(status(metadata, true, false, false, "License verified."));
        }
        return Ok(status(
            metadata,
            false,
            true,
            false,
            "The Q Cafe license is not active.",
        ));
    }
    let code = error_code(response)?;
    if code == "INVALID_LICENSE" || code == "LICENSE_REVOKED" {
        clear_token()?;
        let message = if code == "LICENSE_REVOKED" {
            "This license has been revoked. Contact Tech Media."
        } else {
            "The license is not valid for Q Cafe."
        };
        return Ok(status(metadata, false, true, false, message));
    }
    Err(server_message(&code))
}

fn activate(
    metadata: &LicenseMetadata,
    license_key: &str,
    retry: bool,
) -> Result<ActivationResponse, String> {
    let client = client()?;
    let response = client.post(format!("{}/api/v1/licenses/activate", server_url()?))
        .json(&serde_json::json!({ "appId": APP_ID, "licenseKey": license_key, "machineId": metadata.machine_id, "machineLabel": metadata.machine_label }))
        .send().map_err(|error| format!("Q Cafe could not connect to the license server: {error}"))?;
    if response.status().is_success() {
        return response
            .json::<ActivationResponse>()
            .map_err(|_| "The license server returned an invalid response.".to_string());
    }
    let http_status = response.status();
    let error = server_error(response)?;
    let code = error.code();
    if code == "LICENSE_STATE_CHANGED" && !retry {
        return Err(code.to_string());
    }
    Err(format_cloud_error(http_status, &error))
}

fn client() -> Result<Client, String> {
    Client::builder()
        .timeout(Duration::from_secs(12))
        .user_agent("Q-Cafe-Desktop")
        .build()
        .map_err(|_| "Q Cafe could not configure the license connection.".to_string())
}

fn server_url() -> Result<String, String> {
    let value =
        env::var("QCAFE_LICENSE_SERVER_URL").unwrap_or_else(|_| DEFAULT_SERVER_URL.to_string());
    if !value.starts_with("https://") {
        return Err("The Q Cafe license server must use HTTPS.".to_string());
    }
    Ok(value.trim_end_matches('/').to_string())
}

fn credential() -> Result<Entry, String> {
    let entry = Entry::new(LICENSE_SERVICE, LICENSE_ACCOUNT)
        .map_err(|_| "Windows Credential Manager is unavailable.".to_string())?;
    ensure_windows_credential_manager(&entry)?;
    Ok(entry)
}

#[cfg(target_os = "windows")]
fn ensure_windows_credential_manager(entry: &Entry) -> Result<(), String> {
    if entry
        .get_credential()
        .downcast_ref::<keyring::windows::WinCredential>()
        .is_some()
    {
        return Ok(());
    }
    Err("Q Cafe requires Windows Credential Manager to store licenses securely.".to_string())
}

#[cfg(not(target_os = "windows"))]
fn ensure_windows_credential_manager(_: &Entry) -> Result<(), String> {
    Err("Q Cafe desktop licensing is supported only on Windows.".to_string())
}

fn clear_token() -> Result<(), String> {
    match credential()?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(_) => Err("Windows Credential Manager could not clear the Q Cafe license.".to_string()),
    }
}

fn metadata_path(settings_dir: &Path) -> std::path::PathBuf {
    settings_dir.join("runtime-state.json")
}

fn legacy_metadata_path(settings_dir: &Path) -> std::path::PathBuf {
    settings_dir.join("license.json")
}

fn load_or_create_metadata(settings_dir: &Path) -> Result<LicenseMetadata, String> {
    let path = metadata_path(settings_dir);
    if path.is_file() {
        return serde_json::from_str(
            &fs::read_to_string(path)
                .map_err(|_| "Q Cafe license metadata could not be read.".to_string())?,
        )
        .map_err(|_| "Q Cafe license metadata is invalid.".to_string());
    }
    let legacy_path = legacy_metadata_path(settings_dir);
    if legacy_path.is_file() {
        let metadata = serde_json::from_str(
            &fs::read_to_string(&legacy_path)
                .map_err(|_| "Q Cafe activation data could not be read.".to_string())?,
        )
        .map_err(|_| "Q Cafe activation data is invalid.".to_string())?;
        save_metadata(settings_dir, &metadata)?;
        let _ = fs::remove_file(legacy_path);
        return Ok(metadata);
    }
    let metadata = LicenseMetadata {
        machine_id: Uuid::new_v4().to_string(),
        machine_label: default_machine_label(),
        license_id: None,
        activated_at: None,
        serial_uuid: None,
        last_validated_at: None,
        app_id: APP_ID.to_string(),
        trial_mode: false,
    };
    save_metadata(settings_dir, &metadata)?;
    Ok(metadata)
}

fn save_metadata(settings_dir: &Path, metadata: &LicenseMetadata) -> Result<(), String> {
    fs::create_dir_all(settings_dir)
        .map_err(|_| "Q Cafe license metadata could not be saved.".to_string())?;
    fs::write(
        metadata_path(settings_dir),
        serde_json::to_vec_pretty(metadata)
            .map_err(|_| "Q Cafe license metadata could not be saved.".to_string())?,
    )
    .map_err(|_| "Q Cafe license metadata could not be saved.".to_string())
}

fn status(
    metadata: &LicenseMetadata,
    licensed: bool,
    activation_required: bool,
    offline: bool,
    message: &str,
) -> LicenseStatus {
    LicenseStatus {
        licensed,
        activation_required,
        machine_id: metadata.machine_id.clone(),
        machine_label: metadata.machine_label.clone(),
        license_id: metadata.license_id.clone(),
        activated_at: metadata.activated_at.clone(),
        serial_uuid: metadata.serial_uuid.clone(),
        last_validated_at: metadata.last_validated_at.clone(),
        offline,
        message: message.to_string(),
        activation_response: None,
    }
}

fn normalize_license_key(value: &str) -> Result<String, String> {
    let digits = value
        .chars()
        .filter(char::is_ascii_digit)
        .collect::<String>();
    if digits.len() != 16 {
        return Err("Enter a valid 16-digit license key.".to_string());
    }
    Ok(digits)
}

fn normalized_label(value: &str) -> Result<String, String> {
    let label = value.trim();
    if label.is_empty() || label.chars().count() > 120 {
        return Err("Enter a machine label with up to 120 characters.".to_string());
    }
    Ok(label.to_string())
}

fn default_machine_label() -> String {
    let host = env::var("COMPUTERNAME")
        .or_else(|_| env::var("HOSTNAME"))
        .unwrap_or_else(|_| "DESKTOP".to_string());
    format!("QCafe - {host}").chars().take(120).collect()
}

fn error_code(response: reqwest::blocking::Response) -> Result<String, String> {
    Ok(server_error(response)?.code().to_string())
}

fn server_error(response: reqwest::blocking::Response) -> Result<ServerError, String> {
    response
        .json::<ServerError>()
        .map_err(|_| "The license server returned an unreadable error response.".to_string())
}

impl ServerError {
    fn code(&self) -> &str {
        self.error
            .as_deref()
            .or(self.code.as_deref())
            .unwrap_or("LICENSE_SERVER_ERROR")
    }
}

fn format_cloud_error(http_status: StatusCode, error: &ServerError) -> String {
    let detail = error
        .message
        .as_deref()
        .unwrap_or("No error message was returned.");
    format!(
        "Tech Media Secure response (HTTP {}): {} — {}",
        http_status.as_u16(),
        error.code(),
        detail
    )
}

fn server_message(code: &str) -> String {
    match code {
        "INVALID_REQUEST" => "Enter a valid 16-digit license key.".to_string(),
        "INVALID_LICENSE" => "The license key is not valid for Q Cafe Desktop. Generate the key in Tech Media Secure for application ID qcafe-desktop.".to_string(),
        "LICENSE_REVOKED" => "This license has been revoked. Contact Tech Media.".to_string(),
        "DUPLICATE_MACHINE" => "This license is already active on another computer. Contact Tech Media to reset the licensed machine.".to_string(),
        "RATE_LIMITED" => "Too many attempts. Please wait and try again.".to_string(),
        _ => "Q Cafe could not connect to the license server. Check your connection and retry.".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        fs::remove_dir_all,
        time::{SystemTime, UNIX_EPOCH},
    };

    #[test]
    fn installation_id_is_created_once_and_reused() {
        let path = env::temp_dir().join(format!(
            "q-cafe-license-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let first = load_or_create_metadata(&path).unwrap();
        let second = load_or_create_metadata(&path).unwrap();
        assert_eq!(first.machine_id, second.machine_id);
        assert!(Uuid::parse_str(&first.machine_id).is_ok());
        let _ = remove_dir_all(path);
    }

    #[test]
    fn license_key_requires_sixteen_digits() {
        assert_eq!(
            normalize_license_key("0000-0000-0000-0000").unwrap(),
            "0000000000000000"
        );
        assert!(normalize_license_key("0000-0000").is_err());
    }

    #[test]
    fn invalid_metadata_never_creates_a_licensed_status() {
        let path = env::temp_dir().join(format!(
            "q-cafe-license-invalid-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::create_dir_all(&path).unwrap();
        fs::write(metadata_path(&path), "{licensed:true}").unwrap();
        assert!(load_or_create_metadata(&path).is_err());
        let _ = remove_dir_all(path);
    }

    #[test]
    fn existing_license_metadata_defaults_to_activation_required() {
        let metadata = serde_json::from_str::<LicenseMetadata>(r#"{"machineId":"machine","machineLabel":"Q Cafe","licenseId":null,"activatedAt":null,"appId":"qcafe-desktop"}"#).unwrap();
        assert!(!metadata.trial_mode);
    }

    #[test]
    fn tech_media_secure_error_envelope_uses_error_field() {
        let payload =
            serde_json::from_str::<ServerError>(r#"{"error":"DUPLICATE_MACHINE"}"#).unwrap();
        assert_eq!(payload.error.as_deref(), Some("DUPLICATE_MACHINE"));
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn license_uses_windows_credential_manager() {
        let entry = credential().unwrap();
        assert!(entry
            .get_credential()
            .downcast_ref::<keyring::windows::WinCredential>()
            .is_some());
    }
}
