#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::command;
use std::{fs, path::Path};

#[command]
fn load_config() -> Result<serde_json::Value, String> {
    let path = Path::new("data.json");

    if !path.exists() {
        let default = r#"{"characterTypeName": "キャラ", "keywords": [], "defaults": []}"#;
        fs::create_dir_all(path.parent().unwrap()).map_err(|e| e.to_string())?;
        fs::write(&path, default).map_err(|e| e.to_string())?;
    }

    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let json = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(json)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![load_config])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
