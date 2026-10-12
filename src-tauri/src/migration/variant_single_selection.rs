use serde_json::Value;

pub fn migrate_data(data: &mut Value) {
    for concept in data
        .get_mut("concepts")
        .and_then(Value::as_array_mut)
        .into_iter()
        .flatten()
    {
        for group in concept
            .get_mut("variantGroups")
            .and_then(Value::as_array_mut)
            .into_iter()
            .flatten()
        {
            if let Some(object) = group.as_object_mut() {
                object.remove("minSelections");
                object.remove("maxSelections");
            }
        }

        for preset in concept
            .get_mut("presets")
            .and_then(Value::as_array_mut)
            .into_iter()
            .flatten()
        {
            let Some(selections) = preset
                .get_mut("variantSelections")
                .and_then(Value::as_array_mut)
            else {
                continue;
            };
            let mut migrated = Vec::with_capacity(selections.len());
            for selection in selections.drain(..) {
                let Some(mut object) = selection.as_object().cloned() else {
                    migrated.push(selection);
                    continue;
                };
                if object.get("variantId").and_then(Value::as_str).is_some() {
                    migrated.push(Value::Object(object));
                    continue;
                }
                let first = object
                    .remove("variantIds")
                    .and_then(|value| value.as_array().cloned())
                    .and_then(|ids| ids.into_iter().next())
                    .and_then(|value| value.as_str().map(str::to_string));
                if let Some(variant_id) = first {
                    object.insert("variantId".into(), Value::String(variant_id));
                    migrated.push(Value::Object(object));
                }
            }
            *selections = migrated;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn removes_selection_limits_and_converts_to_single_variant() {
        let mut data = json!({
            "schemaVersion": 2,
            "concepts": [{
                "variantGroups": [{
                    "id": "group",
                    "name": "制服",
                    "minSelections": 1,
                    "maxSelections": 2,
                    "variants": []
                }],
                "presets": [{
                    "variantSelections": [
                        {"groupId": "group", "variantIds": ["summer", "winter"]},
                        {"groupId": "empty", "variantIds": []}
                    ]
                }]
            }]
        });

        migrate_data(&mut data);

        let group = &data["concepts"][0]["variantGroups"][0];
        assert!(group.get("minSelections").is_none());
        assert!(group.get("maxSelections").is_none());
        assert_eq!(
            data["concepts"][0]["presets"][0]["variantSelections"],
            json!([{"groupId":"group","variantId":"summer"}])
        );
    }
}
