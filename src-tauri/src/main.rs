mod config;
mod migration;
mod model;
mod validation;

use crate::model::{Data, PromptGeneratorsData};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::command;

#[derive(Debug, Serialize)]
pub struct LoadPayload {
    data: Data,
    prompt_generators: PromptGeneratorsData,
}

#[command]
fn load_configs() -> Result<LoadPayload, String> {
    let payload = config::load_configs(Path::new("."))?;
    Ok(LoadPayload {
        data: serde_json::from_value(payload.data).map_err(|e| format!("Invalid V2 data: {e}"))?,
        prompt_generators: serde_json::from_value(payload.prompt_generators)
            .map_err(|e| format!("Invalid V2 prompt generators: {e}"))?,
    })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SavePayload {
    data: Data,
    prompt_generators: PromptGeneratorsData,
}

#[tauri::command]
async fn save_data(payload: SavePayload) -> Result<(), String> {
    let data = serde_json::to_value(payload.data).map_err(|e| e.to_string())?;
    let prompt_generators =
        serde_json::to_value(payload.prompt_generators).map_err(|e| e.to_string())?;
    validation::validate_pair(&data, &prompt_generators)?;
    config::atomic_write(Path::new("./data.json"), &data)?;
    config::atomic_write(Path::new("./prompt-generators.json"), &prompt_generators)?;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![load_configs, save_data])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn save_payload_accepts_inline_templates() {
        let input = json!({
            "data": {"schemaVersion":2,"attributes":[],"categories":[],"concepts":[{
                "id":"c","name":"C","categoryId":"","attributeIds":[],"variantGroups":[],"presets":[],
                "promptFragments":{"root":[{"parts":[{"fragmentId":"f"}," panties"]}],"definitions":[
                    {"id":"f","name":"Color","if":{"all":[]},"fragments":["white"]}
                ]},
                "negativePromptFragments":{"root":[],"definitions":[]}
            }]},
            "promptGenerators":{"schemaVersion":2,"promptGenerators":[]}
        });
        let payload: SavePayload = serde_json::from_value(input.clone()).unwrap();
        assert_eq!(serde_json::to_value(payload.data).unwrap(), input["data"]);
    }
}
