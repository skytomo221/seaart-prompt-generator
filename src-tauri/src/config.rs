use crate::{migration, validation};
use serde_json::{json, Value};
use std::{fs, io::Write, path::Path};

#[derive(Debug)]
pub struct ConfigPayload {
    pub data: Value,
    pub prompt_generators: Value,
}

pub fn load_configs(root: &Path) -> Result<ConfigPayload, String> {
    let data_path = root.join("data.json");
    let pg_path = root.join("prompt-generators.json");
    if !data_path.exists() {
        atomic_write(
            &data_path,
            &json!({"schemaVersion":2,"attributes":[],"categories":[],"concepts":[]}),
        )?;
    }
    if !pg_path.exists() {
        let slots: Vec<Value> = (0..8)
            .map(|_| json!({"id":uuid::Uuid::new_v4().to_string()}))
            .collect();
        atomic_write(
            &pg_path,
            &json!({"schemaVersion":2,"promptGenerators":[{"id":uuid::Uuid::new_v4().to_string(),"presetSlots":slots}]}),
        )?;
    }
    let raw_data: Value =
        serde_json::from_slice(&fs::read(&data_path).map_err(|error| error.to_string())?)
            .map_err(|error| error.to_string())?;
    let raw_pg: Value =
        serde_json::from_slice(&fs::read(&pg_path).map_err(|error| error.to_string())?)
            .map_err(|error| error.to_string())?;
    let data_version = raw_data.get("schemaVersion").and_then(Value::as_u64);
    let generator_version = raw_pg.get("schemaVersion").and_then(Value::as_u64);
    for version in [data_version, generator_version].into_iter().flatten() {
        if version != 1 && version != 2 {
            return Err(format!("Unsupported schema version: {version}"));
        }
    }
    if (data_version.is_none() || data_version == Some(1)) && generator_version == Some(2) {
        return Err("Cannot safely migrate V1 data.json with V2 prompt-generators.json because preset IDs cannot be resolved.".into());
    }
    let data = migration::migrate_data(
        &raw_data,
        if data_version == Some(2) {
            Some(&raw_pg)
        } else {
            None
        },
    )?;
    let prompt_generators = migration::migrate_generators(&raw_pg, &data)?;
    validation::validate_pair(&data, &prompt_generators)?;
    let data_changed = raw_data != data;
    let generators_changed = raw_pg != prompt_generators;
    if data_changed {
        backup_once(
            &data_path,
            if data_version == Some(2) {
                ".v2-draft.bak"
            } else {
                ".v1.bak"
            },
        )?;
    }
    if generators_changed {
        backup_once(
            &pg_path,
            if generator_version == Some(2) {
                ".v2-draft.bak"
            } else {
                ".v1.bak"
            },
        )?;
    }
    if data_changed {
        atomic_write(&data_path, &data)?;
    }
    if generators_changed {
        atomic_write(&pg_path, &prompt_generators)?;
    }
    Ok(ConfigPayload {
        data,
        prompt_generators,
    })
}

fn backup_once(path: &Path, suffix: &str) -> Result<(), String> {
    let mut name = path.as_os_str().to_owned();
    name.push(suffix);
    let target = std::path::PathBuf::from(name);
    if !target.exists() {
        fs::copy(path, target).map_err(|error| format!("Backup failed: {error}"))?;
    }
    Ok(())
}

pub fn atomic_write(path: &Path, value: &Value) -> Result<(), String> {
    let mut tmp = path.as_os_str().to_owned();
    tmp.push(".tmp");
    let tmp = std::path::PathBuf::from(tmp);
    let bytes = serde_json::to_vec_pretty(value).map_err(|error| error.to_string())?;
    {
        let mut file = fs::File::create(&tmp).map_err(|error| error.to_string())?;
        file.write_all(&bytes).map_err(|error| error.to_string())?;
        file.sync_all().map_err(|error| error.to_string())?;
    }
    replace_file(&tmp, path).map_err(|error| {
        let _ = fs::remove_file(&tmp);
        format!("Atomic replace failed: {error}")
    })?;
    Ok(())
}

#[cfg(not(windows))]
fn replace_file(from: &Path, to: &Path) -> std::io::Result<()> {
    fs::rename(from, to)
}
#[cfg(windows)]
fn replace_file(from: &Path, to: &Path) -> std::io::Result<()> {
    use std::os::windows::ffi::OsStrExt;
    #[link(name = "kernel32")]
    unsafe extern "system" {
        fn MoveFileExW(existing: *const u16, new_name: *const u16, flags: u32) -> i32;
    }
    let source: Vec<u16> = from.as_os_str().encode_wide().chain(Some(0)).collect();
    let target: Vec<u16> = to.as_os_str().encode_wide().chain(Some(0)).collect();
    const MOVEFILE_REPLACE_EXISTING: u32 = 0x1;
    const MOVEFILE_WRITE_THROUGH: u32 = 0x8;
    let ok = unsafe {
        MoveFileExW(
            source.as_ptr(),
            target.as_ptr(),
            MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
        )
    };
    if ok == 0 {
        Err(std::io::Error::last_os_error())
    } else {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::{fs, path::PathBuf};
    fn temp() -> PathBuf {
        let path = std::env::temp_dir().join(format!("seaart-test-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&path).unwrap();
        path
    }
    fn write(path: &Path, value: &Value) {
        fs::write(path, serde_json::to_vec_pretty(value).unwrap()).unwrap();
    }
    #[test]
    fn draft_v2_fragments_are_migrated_without_version_bump() {
        let root = temp();
        write(
            &root.join("data.json"),
            &json!({"schemaVersion":2,"attributes":[],"categories":[{"id":"cat","name":"c","attributeIds":[],"backgroundColor":"","color":""}],"concepts":[{"id":"concept","name":"A","categoryId":"cat","attributeIds":[],"variantGroups":[],"presets":[{"id":"preset","name":"A","variantSelections":[]}],"positiveFragments":["base"],"negativeFragments":[]}]}),
        );
        write(
            &root.join("prompt-generators.json"),
            &json!({"schemaVersion":2,"promptGenerators":[]}),
        );
        let loaded = load_configs(&root).unwrap();
        assert_eq!(loaded.data["schemaVersion"], 2);
        assert_eq!(
            loaded.data["concepts"][0]["promptFragments"]["root"],
            json!(["base"])
        );
        assert!(root.join("data.json.v2-draft.bak").exists());
        fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn existing_v1_backup_is_never_overwritten() {
        let root = temp();
        write(
            &root.join("data.json"),
            &json!({"characterTypeName":"キャラ","keywords":[],"keywordTypes":[],"defaults":[]}),
        );
        write(&root.join("prompt-generators.json"), &json!([]));
        fs::write(root.join("data.json.v1.bak"), b"preserve me").unwrap();
        load_configs(&root).unwrap();
        assert_eq!(
            fs::read(root.join("data.json.v1.bak")).unwrap(),
            b"preserve me"
        );
        fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn unsupported_version_does_not_rewrite_file() {
        let root = temp();
        let original = b"{\"schemaVersion\":77,\"keep\":true}";
        fs::write(root.join("data.json"), original).unwrap();
        write(
            &root.join("prompt-generators.json"),
            &json!({"schemaVersion":2,"promptGenerators":[]}),
        );
        assert!(load_configs(&root)
            .unwrap_err()
            .contains("Unsupported schema version"));
        assert_eq!(fs::read(root.join("data.json")).unwrap(), original);
        fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn fresh_prompt_generator_configuration_has_stable_uuid_slots() {
        let root = temp();
        write(
            &root.join("data.json"),
            &json!({"schemaVersion":2,"attributes":[],"categories":[],"concepts":[]}),
        );
        let first = load_configs(&root).unwrap();
        assert_eq!(
            first.prompt_generators["promptGenerators"][0]["presetSlots"]
                .as_array()
                .unwrap()
                .len(),
            8
        );
        let first_generators = first.prompt_generators.clone();
        let second = load_configs(&root).unwrap();
        assert_eq!(first_generators, second.prompt_generators);
        fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn v1_data_with_v2_generators_fails_without_changing_files() {
        let root = temp();
        let old_data =
            json!({"characterTypeName":"キャラ","keywordTypes":[],"keywords":[],"defaults":[]});
        let old_generators = json!({"schemaVersion":2,"promptGenerators":[]});
        write(&root.join("data.json"), &old_data);
        write(&root.join("prompt-generators.json"), &old_generators);
        assert!(load_configs(&root)
            .unwrap_err()
            .contains("Cannot safely migrate V1 data.json"));
        assert_eq!(
            serde_json::from_slice::<Value>(&fs::read(root.join("data.json")).unwrap()).unwrap(),
            old_data
        );
        assert_eq!(
            serde_json::from_slice::<Value>(
                &fs::read(root.join("prompt-generators.json")).unwrap()
            )
            .unwrap(),
            old_generators
        );
        fs::remove_dir_all(root).unwrap();
    }
}
