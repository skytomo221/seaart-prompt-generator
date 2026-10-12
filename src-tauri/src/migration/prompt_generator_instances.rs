use serde_json::{json, Value};

pub fn migrate_generators(generators: &mut Value, data: &Value) -> Result<(), String> {
    for generator in generators
        .get_mut("promptGenerators")
        .and_then(Value::as_array_mut)
        .into_iter()
        .flatten()
    {
        if generator.get("instances").is_some() {
            continue;
        }
        let slots = generator
            .get_mut("presetSlots")
            .and_then(Value::as_array_mut)
            .map(std::mem::take)
            .unwrap_or_default();
        let mut instances = Vec::with_capacity(slots.len());
        for slot in slots {
            let id = slot
                .get("id")
                .and_then(Value::as_str)
                .ok_or("PresetSlot is missing id")?;
            let Some(preset_id) = slot.get("presetId").and_then(Value::as_str) else {
                instances.push(json!({"id":id,"variantSelections":[]}));
                continue;
            };
            let mut resolved = None;
            for concept in data
                .get("concepts")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
            {
                if let Some(preset) = concept
                    .get("presets")
                    .and_then(Value::as_array)
                    .into_iter()
                    .flatten()
                    .find(|preset| preset.get("id").and_then(Value::as_str) == Some(preset_id))
                {
                    resolved = Some((concept, preset));
                    break;
                }
            }
            let Some((concept, preset)) = resolved else {
                return Err(format!("Cannot resolve Preset {preset_id} while migrating prompt generator"));
            };
            instances.push(json!({
                "id": id,
                "conceptId": concept["id"],
                "presetId": preset["id"],
                "variantSelections": preset["variantSelections"],
            }));
        }
        if let Some(object) = generator.as_object_mut() {
            object.remove("presetSlots");
            object.insert("instances".into(), Value::Array(instances));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn copies_preset_variants_into_independent_instances() {
        let data = json!({"concepts":[{"id":"c","presets":[{"id":"p","variantSelections":[{"groupId":"g","variantId":"summer"}]}]}]});
        let mut generators = json!({"schemaVersion":2,"promptGenerators":[{"id":"pg","presetSlots":[{"id":"i","presetId":"p"},{"id":"blank"}]}]});
        migrate_generators(&mut generators, &data).unwrap();
        let items = &generators["promptGenerators"][0]["instances"];
        assert_eq!(items[0]["conceptId"], "c");
        assert_eq!(items[0]["variantSelections"][0]["variantId"], "summer");
        assert!(items[1].get("presetId").is_none());
        assert!(generators["promptGenerators"][0].get("presetSlots").is_none());
    }
}
