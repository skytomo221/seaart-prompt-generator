use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};
use uuid::Uuid;

fn id() -> String {
    Uuid::new_v4().to_string()
}
fn arr(v: &Value, key: &str) -> Vec<Value> {
    v.get(key)
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default()
}
fn text(v: &Value, key: &str) -> String {
    v.get(key)
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string()
}
fn tags(v: &str) -> Vec<Value> {
    v.split(',')
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|s| json!(s))
        .collect()
}
fn category_id(categories: &[Value], name: &str) -> Option<String> {
    categories
        .iter()
        .find(|c| c["name"] == name)
        .map(|c| text(c, "id"))
}

fn invert_condition(condition: Value) -> Result<Value, String> {
    if let Some(items) = condition.get("all").and_then(Value::as_array) {
        return Ok(
            json!({"any": items.iter().cloned().map(invert_condition).collect::<Result<Vec<_>,_>>()?}),
        );
    }
    if let Some(items) = condition.get("any").and_then(Value::as_array) {
        return Ok(
            json!({"all": items.iter().cloned().map(invert_condition).collect::<Result<Vec<_>,_>>()?}),
        );
    }
    for key in ["category", "attribute", "preset"] {
        if let Some(item) = condition.get(key) {
            let mut next = item.clone();
            let operator = item.get("operator").and_then(Value::as_str).unwrap_or("is");
            next["operator"] = json!(if operator == "is" { "isNot" } else { "is" });
            let mut object = serde_json::Map::new();
            object.insert(key.to_string(), next);
            return Ok(Value::Object(object));
        }
    }
    if let Some(item) = condition.get("concept") {
        let mut next = item.clone();
        let operator = item.get("operator").and_then(Value::as_str).unwrap_or("is");
        next["operator"] = json!(match operator {
            "is" => "isNot",
            "isNot" => "is",
            "variantsMatch" => "variantsDoNotMatch",
            "variantsDoNotMatch" => "variantsMatch",
            _ =>
                return Err(format!(
                    "Cannot invert concept condition operator {operator}"
                )),
        });
        return Ok(json!({"concept": next}));
    }
    Err("Cannot invert draft V2 condition".into())
}

fn convert_old_condition(
    condition: &Value,
    owner_concept_id: &str,
    group_owner: &HashMap<String, String>,
) -> Result<Value, String> {
    if let Some(inner) = condition.get("not") {
        return invert_condition(convert_old_condition(inner, owner_concept_id, group_owner)?);
    }
    if let Some(items) = condition.get("all").and_then(Value::as_array) {
        return Ok(
            json!({"all": items.iter().map(|item| convert_old_condition(item, owner_concept_id, group_owner)).collect::<Result<Vec<_>,_>>()?}),
        );
    }
    if let Some(items) = condition.get("any").and_then(Value::as_array) {
        return Ok(
            json!({"any": items.iter().map(|item| convert_old_condition(item, owner_concept_id, group_owner)).collect::<Result<Vec<_>,_>>()?}),
        );
    }
    let matcher = condition
        .get("self")
        .or_else(|| condition.get("exists"))
        .ok_or("Unsupported draft V2 Condition")?;
    let mut conditions = Vec::<Value>::new();
    let concept_id = matcher
        .get("conceptId")
        .and_then(Value::as_str)
        .map(str::to_string);
    if let Some(cid) = &concept_id {
        conditions.push(json!({"concept":{"conceptId":cid,"operator":"is"}}));
    }
    if let Some(cid) = matcher.get("categoryId").and_then(Value::as_str) {
        conditions.push(json!({"category":{"categoryId":cid,"operator":"is"}}));
    }
    if let Some(aid) = matcher.get("attributeId").and_then(Value::as_str) {
        conditions.push(json!({"attribute":{"attributeId":aid,"operator":"is"}}));
    }
    if let Some(variant) = matcher.get("variant") {
        let group_id = variant
            .get("groupId")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let variant_id = variant
            .get("variantId")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let cid = concept_id
            .clone()
            .or_else(|| group_owner.get(group_id).cloned())
            .unwrap_or_else(|| owner_concept_id.to_string());
        conditions.push(json!({"concept":{"conceptId":cid,"operator":"variantsMatch","variants":[{"groupId":group_id,"variantId":variant_id}]}}));
    }
    if conditions.is_empty() {
        return Err("Cannot migrate empty draft V2 matcher".into());
    }
    if conditions.len() == 1 {
        Ok(conditions.remove(0))
    } else {
        Ok(json!({"all":conditions}))
    }
}

fn convert_old_fragments(
    fragments: &[Value],
    owner_concept_id: &str,
    group_owner: &HashMap<String, String>,
    definitions: &mut Vec<Value>,
    counter: &mut usize,
) -> Result<Vec<Value>, String> {
    let mut result = Vec::new();
    for fragment in fragments {
        if fragment.is_string() || fragment.get("fragmentId").is_some() {
            result.push(fragment.clone());
            continue;
        }
        let old_condition = fragment
            .get("if")
            .ok_or("Draft V2 conditional fragment has no condition")?;
        let condition = convert_old_condition(old_condition, owner_concept_id, group_owner)?;
        let then_items = fragment
            .get("then")
            .and_then(Value::as_array)
            .ok_or("Draft V2 conditional fragment has invalid then")?;
        *counter += 1;
        let definition_id = id();
        let name = format!("条件付きフラグメント {}", *counter);
        let converted = convert_old_fragments(
            then_items,
            owner_concept_id,
            group_owner,
            definitions,
            counter,
        )?;
        definitions
            .push(json!({"id":definition_id,"name":name,"if":condition,"fragments":converted}));
        result.push(json!({"fragmentId":definition_id}));
        if let Some(else_items) = fragment.get("else").and_then(Value::as_array) {
            if !else_items.is_empty() {
                *counter += 1;
                let else_id = id();
                let else_name = format!("条件付きフラグメント {}", *counter);
                let converted_else = convert_old_fragments(
                    else_items,
                    owner_concept_id,
                    group_owner,
                    definitions,
                    counter,
                )?;
                definitions.push(json!({"id":else_id,"name":else_name,"if":invert_condition(convert_old_condition(old_condition, owner_concept_id, group_owner)?)?,"fragments":converted_else}));
                result.push(json!({"fragmentId":else_id}));
            }
        }
    }
    Ok(result)
}

fn migrate_draft_fragment_shape(data: &mut Value) -> Result<bool, String> {
    let group_owner: HashMap<String, String> = data["concepts"]
        .as_array()
        .into_iter()
        .flatten()
        .flat_map(|concept| {
            let concept_id = text(concept, "id");
            arr(concept, "variantGroups")
                .into_iter()
                .map(move |group| (text(&group, "id"), concept_id.clone()))
        })
        .collect();
    let mut changed = false;
    for concept in data["concepts"].as_array_mut().into_iter().flatten() {
        let owner_id = text(concept, "id");
        if concept.get("promptFragments").is_none() {
            let positive = concept
                .get("positiveFragments")
                .and_then(Value::as_array)
                .cloned()
                .unwrap_or_default();
            let mut definitions = Vec::new();
            let mut counter = 0usize;
            let root = convert_old_fragments(
                &positive,
                &owner_id,
                &group_owner,
                &mut definitions,
                &mut counter,
            )?;
            concept["promptFragments"] = json!({"root":root,"definitions":definitions});
            changed = true;
        }
        if concept.get("negativePromptFragments").is_none() {
            let negative = concept
                .get("negativeFragments")
                .and_then(Value::as_array)
                .cloned()
                .unwrap_or_default();
            let mut definitions = Vec::new();
            let mut counter = 0usize;
            let root = convert_old_fragments(
                &negative,
                &owner_id,
                &group_owner,
                &mut definitions,
                &mut counter,
            )?;
            concept["negativePromptFragments"] = json!({"root":root,"definitions":definitions});
            changed = true;
        }
        if concept
            .as_object_mut()
            .unwrap()
            .remove("positiveFragments")
            .is_some()
        {
            changed = true;
        }
        if concept
            .as_object_mut()
            .unwrap()
            .remove("negativeFragments")
            .is_some()
        {
            changed = true;
        }
    }
    Ok(changed)
}

fn unique_definition_name(definitions: &[Value], base: &str) -> String {
    if !definitions
        .iter()
        .any(|definition| definition["name"] == base)
    {
        return base.to_string();
    }
    let mut index = 2;
    loop {
        let candidate = format!("{base} {index}");
        if !definitions
            .iter()
            .any(|definition| definition["name"] == candidate)
        {
            return candidate;
        }
        index += 1;
    }
}

pub fn migrate_data(v: &Value, _mixed: Option<&Value>) -> Result<Value, String> {
    let version = v.get("schemaVersion").and_then(Value::as_u64);
    if version == Some(2) {
        let mut migrated = v.clone();
        if let Some(old_presets) = v.get("presets") {
            let old_presets = old_presets
                .as_array()
                .ok_or("Draft V2 presets must be an array")?;
            for concept in migrated["concepts"].as_array_mut().into_iter().flatten() {
                if concept.get("presets").is_none() {
                    concept["presets"] = json!([]);
                }
            }
            for old in old_presets {
                let name = text(old, "name");
                let instances = old
                    .get("instances")
                    .and_then(Value::as_array)
                    .ok_or_else(|| format!("Preset \"{name}\" has invalid ConceptInstances"))?;
                if instances.len() > 1 {
                    return Err(format!("Preset \"{name}\" contains multiple ConceptInstances and cannot be migrated automatically."));
                }
                if instances.is_empty() {
                    return Err(format!("Preset \"{name}\" contains no ConceptInstance and cannot be migrated automatically."));
                }
                let instance = &instances[0];
                let concept_id = text(instance, "conceptId");
                let concept = migrated["concepts"]
                    .as_array_mut()
                    .and_then(|concepts| {
                        concepts
                            .iter_mut()
                            .find(|concept| concept["id"] == concept_id)
                    })
                    .ok_or_else(|| {
                        format!("Preset \"{name}\" references missing Concept {concept_id}")
                    })?;
                let selections = instance
                    .get("variantSelections")
                    .cloned()
                    .unwrap_or_else(|| json!([]));
                concept["presets"]
                    .as_array_mut()
                    .ok_or_else(|| format!("Concept {concept_id} has invalid presets"))?
                    .push(json!({"id":old["id"],"name":name,"variantSelections":selections}));
            }
            migrated.as_object_mut().unwrap().remove("presets");
        }
        migrate_draft_fragment_shape(&mut migrated)?;
        return Ok(migrated);
    }
    if v.get("schemaVersion").is_some() && (version.is_none() || version != Some(1)) {
        return Err(format!(
            "Unsupported schema version: {}",
            v["schemaVersion"]
        ));
    }

    let old_types = arr(v, "keywordTypes");
    let keywords = arr(v, "keywords");
    let defaults = arr(v, "defaults");
    let char_type = text(v, "characterTypeName");
    let mut categories: Vec<Value> = Vec::new();
    for item in &old_types {
        let name = text(item, "name");
        categories.push(json!({"id":id(),"name":name,"attributeIds":[],"backgroundColor":item["backgroundColor"].as_str().unwrap_or("#ffffff"),"color":item["color"].as_str().unwrap_or("#000000")}));
    }
    let mut names = Vec::new();
    for keyword in &keywords {
        names.push(text(keyword, "type"));
    }
    for default in &defaults {
        for part in arr(default, "parts") {
            names.push(text(&part, "type"));
        }
    }
    names.push(char_type.clone());
    for name in names {
        if !name.is_empty() && category_id(&categories, &name).is_none() {
            categories.push(json!({"id":id(),"name":name,"attributeIds":[],"backgroundColor":"#ffffff","color":"#000000"}));
        }
    }

    let mut concepts = Vec::new();
    let mut concept_by_name = HashMap::<String, (String, String)>::new();
    for keyword in &keywords {
        let name = text(keyword, "name");
        let category = category_id(&categories, &text(keyword, "type"))
            .ok_or_else(|| format!("Missing category for keyword {name}"))?;
        let concept_id = id();
        let preset_id = id();
        concepts.push(json!({"id":concept_id,"name":name,"categoryId":category,"attributeIds":[],"variantGroups":[],"presets":[{"id":preset_id,"name":name,"variantSelections":[]}],"promptFragments":{"root":tags(&text(keyword,"prompt")),"definitions":[]},"negativePromptFragments":{"root":tags(&text(keyword,"negativePrompt")),"definitions":[]}}));
        if text(keyword, "type") == char_type {
            concept_by_name
                .entry(name)
                .or_insert((concept_id, category));
        }
    }

    let mut migrated_defaults = HashSet::new();
    for default in defaults {
        let character = text(&default, "character");
        if !migrated_defaults.insert(character.clone()) {
            continue;
        }
        let Some((concept_id, _)) = concept_by_name.get(&character).cloned() else {
            return Err(format!("Cannot resolve DefaultCharacter: {character}"));
        };
        let concept = concepts
            .iter_mut()
            .find(|candidate| candidate["id"] == concept_id)
            .ok_or("Missing migrated concept")?;
        for part in arr(&default, "parts") {
            let part_type = text(&part, "type");
            let category_id = category_id(&categories, &part_type)
                .ok_or_else(|| format!("Cannot resolve default category: {part_type}"))?;
            let definition_id = id();
            let definitions = concept["promptFragments"]["definitions"]
                .as_array_mut()
                .unwrap();
            let definition_name =
                unique_definition_name(definitions, &format!("デフォルト{part_type}"));
            definitions.push(json!({"id":definition_id,"name":definition_name,"if":{"category":{"categoryId":category_id,"operator":"isNot"}},"fragments":tags(&text(&part,"prompt"))}));
            concept["promptFragments"]["root"]
                .as_array_mut()
                .unwrap()
                .push(json!({"fragmentId":definition_id}));
        }
    }
    Ok(json!({"schemaVersion":2,"attributes":[],"categories":categories,"concepts":concepts}))
}

pub fn migrate_generators(v: &Value, data: &Value) -> Result<Value, String> {
    if v.get("schemaVersion").and_then(Value::as_u64) == Some(2) {
        return Ok(v.clone());
    }
    if v.get("schemaVersion").and_then(Value::as_u64).is_some() {
        return Err("Unsupported schema version".into());
    }
    let mut generators = Vec::new();
    for generator in v
        .as_array()
        .ok_or("V1 prompt-generators must be an array")?
    {
        let mut slots = Vec::new();
        for old in generator["selectedKeywordNames"]
            .as_array()
            .ok_or("Missing selectedKeywordNames")?
        {
            let name = text(old, "name");
            let slot_id = old["id"].as_str().map(str::to_string).unwrap_or_else(id);
            let mut slot = json!({"id":slot_id});
            if name != "空白" {
                let preset = data["concepts"]
                    .as_array()
                    .into_iter()
                    .flatten()
                    .flat_map(|concept| concept["presets"].as_array().into_iter().flatten())
                    .find(|preset| preset["name"] == name)
                    .ok_or_else(|| format!("Cannot resolve keyword name: {name}"))?;
                slot["presetId"] = preset["id"].clone();
            }
            slots.push(slot);
        }
        let generator_id = generator["id"]
            .as_str()
            .map(str::to_string)
            .unwrap_or_else(id);
        generators.push(json!({"id":generator_id,"presetSlots":slots}));
    }
    Ok(json!({"schemaVersion":2,"promptGenerators":generators}))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn migrates_keywords_and_comma_tags() {
        let old = json!({"characterTypeName":"キャラ","keywordTypes":[{"name":"キャラ","backgroundColor":"red","color":"white"}],"keywords":[{"name":"イリヤ","type":"キャラ","prompt":"one, two,, three ","negativePrompt":"bad, worse"}],"defaults":[]});
        let value = migrate_data(&old, None).unwrap();
        assert_eq!(value["schemaVersion"], 2);
        assert_eq!(
            value["concepts"][0]["promptFragments"]["root"],
            json!(["one", "two", "three"])
        );
        assert_eq!(
            value["concepts"][0]["negativePromptFragments"]["root"],
            json!(["bad", "worse"])
        );
    }
    #[test]
    fn translates_defaults_to_named_fragment() {
        let old = json!({"characterTypeName":"キャラ","keywordTypes":[{"name":"キャラ"}],"keywords":[{"name":"A","type":"キャラ","prompt":"base"}],"defaults":[{"character":"A","parts":[{"type":"衣装","prompt":"coat, hat"}]}]});
        let value = migrate_data(&old, None).unwrap();
        let set = &value["concepts"][0]["promptFragments"];
        assert_eq!(set["definitions"][0]["name"], "デフォルト衣装");
        assert_eq!(set["definitions"][0]["if"]["category"]["operator"], "isNot");
    }
    #[test]
    fn migrates_unreleased_v2_conditional_fragments_without_bumping_version() {
        let draft = json!({"schemaVersion":2,"attributes":[],"categories":[{"id":"cat","name":"衣装","attributeIds":[],"backgroundColor":"","color":""}],"concepts":[{"id":"c","name":"C","categoryId":"cat","attributeIds":[],"variantGroups":[],"presets":[],"positiveFragments":["base",{"if":{"not":{"exists":{"categoryId":"cat"}}},"then":["default"]}],"negativeFragments":[]}]});
        let value = migrate_data(&draft, None).unwrap();
        assert_eq!(value["schemaVersion"], 2);
        assert_eq!(
            value["concepts"][0]["promptFragments"]["definitions"][0]["if"]["category"]["operator"],
            "isNot"
        );
    }
    #[test]
    fn translates_generator_slots_and_blank() {
        let data = json!({"concepts":[{"presets":[{"id":"p","name":"A"}]}]});
        let old = json!([{"id":"g","selectedKeywordNames":[{"id":"s","name":"A"},{"id":"b","name":"空白"}]}]);
        let migrated = migrate_generators(&old, &data).unwrap();
        assert_eq!(
            migrated["promptGenerators"][0]["presetSlots"][0]["presetId"],
            "p"
        );
        assert!(migrated["promptGenerators"][0]["presetSlots"][1]
            .get("presetId")
            .is_none());
    }
    #[test]
    fn refuses_lossy_multi_instance_draft_preset() {
        let draft = json!({"schemaVersion":2,"attributes":[],"categories":[],"concepts":[{"id":"c","name":"C","presets":[],"positiveFragments":[],"negativeFragments":[]}],"presets":[{"id":"p","name":"two","instances":[{"id":"a","conceptId":"c"},{"id":"b","conceptId":"c"}]}]});
        assert_eq!(migrate_data(&draft, None).unwrap_err(), "Preset \"two\" contains multiple ConceptInstances and cannot be migrated automatically.");
    }
}
