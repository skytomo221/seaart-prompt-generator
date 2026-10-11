use serde_json::{json, Value};

pub fn migrate_data(data: &mut Value) -> Result<bool, String> {
    let mut changed = false;
    for concept in data["concepts"].as_array_mut().into_iter().flatten() {
        for set_key in ["promptFragments", "negativePromptFragments"] {
            let Some(definitions) = concept.get_mut(set_key).and_then(|set| set.get_mut("definitions")).and_then(Value::as_array_mut) else { continue; };
            for definition in definitions {
                if let Some(condition) = definition.get_mut("if") {
                    changed |= normalize_condition(condition)?;
                }
            }
        }
    }
    Ok(changed)
}

fn normalize_condition(condition: &mut Value) -> Result<bool, String> {
    if let Some(items) = condition.get_mut("all").and_then(Value::as_array_mut) {
        let mut changed = false;
        for item in items { changed |= normalize_condition(item)?; }
        return Ok(changed);
    }
    if let Some(items) = condition.get_mut("any").and_then(Value::as_array_mut) {
        let mut changed = false;
        for item in items { changed |= normalize_condition(item)?; }
        return Ok(changed);
    }

    for key in ["category", "attribute", "preset"] {
        if let Some(item) = condition.get_mut(key) {
            if item.get("existence").is_some() { return Ok(false); }
            let operator = item.get("operator").and_then(Value::as_str).unwrap_or("is");
            if operator == "isNot" {
                item["operator"] = json!("is");
                item["existence"] = json!("notExists");
            } else {
                item["existence"] = json!("exists");
            }
            return Ok(true);
        }
    }

    if condition.get("concept").is_some() {
        let replacement = {
            let item = condition.get_mut("concept").expect("concept checked above");
            if item.get("existence").is_some() { return Ok(false); }
            let operator = item.get("operator").and_then(Value::as_str).unwrap_or("is");
            match operator {
                "is" => {
                    item["existence"] = json!("exists");
                    None
                }
                "isNot" => {
                    item["operator"] = json!("is");
                    item["existence"] = json!("notExists");
                    None
                }
                "variantsMatch" => {
                    item["existence"] = json!("exists");
                    None
                }
                "variantsDoNotMatch" => {
                    let concept_id = item.get("conceptId").cloned().ok_or("Concept condition is missing conceptId")?;
                    let variants = item.get("variants").cloned().unwrap_or_else(|| json!([]));
                    Some(json!({
                        "all": [
                            {"concept": {"conceptId": concept_id, "operator": "is", "existence": "exists"}},
                            {"concept": {"conceptId": concept_id, "operator": "variantsMatch", "variants": variants, "existence": "notExists"}}
                        ]
                    }))
                }
                other => return Err(format!("Unknown concept condition operator: {other}")),
            }
        };
        if let Some(replacement) = replacement { *condition = replacement; }
        return Ok(true);
    }

    Err("Unknown Condition shape while migrating instance existence".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preserves_old_is_not_as_no_matching_instance() {
        let mut data = json!({"concepts":[{"promptFragments":{"definitions":[{"if":{"category":{"categoryId":"clothes","operator":"isNot"}}}]},"negativePromptFragments":{"definitions":[]}}]});
        assert!(migrate_data(&mut data).unwrap());
        let condition = &data["concepts"][0]["promptFragments"]["definitions"][0]["if"]["category"];
        assert_eq!(condition["operator"], "is");
        assert_eq!(condition["existence"], "notExists");
    }

    #[test]
    fn keeps_explicit_new_semantics_unchanged() {
        let mut data = json!({"concepts":[{"promptFragments":{"definitions":[{"if":{"category":{"categoryId":"clothes","operator":"isNot","existence":"exists"}}}]},"negativePromptFragments":{"definitions":[]}}]});
        assert!(!migrate_data(&mut data).unwrap());
        assert_eq!(data["concepts"][0]["promptFragments"]["definitions"][0]["if"]["category"]["operator"], "isNot");
    }
}
