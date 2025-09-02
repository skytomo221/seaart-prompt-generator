#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use serde_json::{json, Value as Json};
use std::{fs, path::Path};
use tauri::command;

#[derive(Serialize)]
struct LoadPayload {
    data: serde_json::Value,
    prompt_generators: serde_json::Value,
}

#[command]
fn load_configs() -> Result<LoadPayload, String> {
    let default_data_json = r#"{"characterTypeName": "キャラ", "keywords": [], "keywordTypes": [], "defaults": []}"#;
    let data = load_json("./data.json", default_data_json)?;
    let default_prompt_generators_json = r#"[]"#;
    let prompt_generators = load_json("./prompt-generators.json", default_prompt_generators_json)?;
    Ok(LoadPayload {
        data,
        prompt_generators,
    })
}

fn load_json<P: AsRef<Path>>(path: P, default_json: &str) -> Result<serde_json::Value, String> {
    let path = path.as_ref();
    if !path.exists() {
        // 必要ならデフォルトを書き込む
        fs::create_dir_all(path.parent().unwrap()).map_err(|e| e.to_string())?;
        fs::write(path, default_json).map_err(|e| e.to_string())?;
    }
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let json = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(json)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SavePayload {
    keywords: Json,
    keyword_types: Json,
    defaults: Json,
    prompt_generators: Json,
}

#[tauri::command]
async fn save_data(payload: SavePayload) -> Result<(), String> {
    let data = json!({
        "characterTypeName": "キャラ",
        "keywords": payload.keywords,
        "keywordTypes": payload.keyword_types,
        "defaults": payload.defaults
    });
    fs::write(
        Path::new("./data.json"),
        serde_json::to_vec_pretty(&data).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    fs::write(
        Path::new("./prompt-generators.json"),
        serde_json::to_vec_pretty(&payload.prompt_generators).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![load_configs, save_data])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
