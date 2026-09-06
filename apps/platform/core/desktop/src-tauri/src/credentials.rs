use keyring::{Entry, Error};

fn entry(name: &str) -> Result<Entry, String> {
    if !["identity-refresh", "dcs-device", "zxa-vps"].contains(&name) {
        return Err("Unknown credential slot".into());
    }
    Entry::new("in.codexsun.desktop", name).map_err(|_| "Credential store unavailable".into())
}

#[tauri::command]
pub fn read_credential(name: String) -> Result<Option<String>, String> {
    match entry(&name)?.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(Error::NoEntry) => Ok(None),
        Err(_) => Err("Credential read failed".into()),
    }
}

#[tauri::command]
pub fn save_credential(name: String, value: String) -> Result<(), String> {
    if value.is_empty() || value.len() > 8192 { return Err("Invalid credential".into()); }
    entry(&name)?.set_password(&value).map_err(|_| "Credential save failed".into())
}

#[tauri::command]
pub fn delete_credential(name: String) -> Result<(), String> {
    match entry(&name)?.delete_credential() {
        Ok(()) | Err(Error::NoEntry) => Ok(()),
        Err(_) => Err("Credential removal failed".into()),
    }
}
