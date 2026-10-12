use crate::model::{
    CompareOperator, ConceptConditionOperator, Condition, Data, PromptFragment, PromptFragmentSet,
    PromptGeneratorsData,
};
use serde_json::Value;
use std::collections::{HashMap, HashSet};

pub fn validate_pair(data_value: &Value, generators_value: &Value) -> Result<(), String> {
    if data_value["schemaVersion"] != 2 {
        return Err("data schemaVersion must be 2".into());
    }
    if generators_value["schemaVersion"] != 2 {
        return Err("promptGenerators schemaVersion must be 2".into());
    }
    let data: Data = serde_json::from_value(data_value.clone())
        .map_err(|error| format!("Invalid V2 Data structure: {error}"))?;
    let generators: PromptGeneratorsData = serde_json::from_value(generators_value.clone())
        .map_err(|error| format!("Invalid V2 PromptGeneratorsData structure: {error}"))?;
    let mut errors = Vec::<String>::new();
    let mut all_ids = HashSet::<String>::new();
    let mut register = |id: &str, label: &str| {
        if !all_ids.insert(id.to_string()) {
            errors.push(format!("Duplicate ID {id} ({label})"));
        }
    };

    let attr_ids: HashSet<String> = data.attributes.iter().map(|item| item.id.clone()).collect();
    let category_ids: HashSet<String> =
        data.categories.iter().map(|item| item.id.clone()).collect();
    let concept_ids: HashSet<String> = data.concepts.iter().map(|item| item.id.clone()).collect();
    let mut preset_ids = HashSet::<String>::new();
    let mut group_owner = HashMap::<String, String>::new();
    let mut variant_group = HashMap::<String, String>::new();

    for attribute in &data.attributes {
        register(&attribute.id, "Attribute");
    }
    for category in &data.categories {
        register(&category.id, "Category");
    }
    for concept in &data.concepts {
        register(&concept.id, "Concept");
        for group in &concept.variant_groups {
            register(&group.id, "VariantGroup");
            group_owner.insert(group.id.clone(), concept.id.clone());
            for variant in &group.variants {
                register(&variant.id, "Variant");
                variant_group.insert(variant.id.clone(), group.id.clone());
            }
        }
        for preset in &concept.presets {
            register(&preset.id, "Preset");
            preset_ids.insert(preset.id.clone());
        }
        for definition in concept
            .prompt_fragments
            .definitions
            .iter()
            .chain(concept.negative_prompt_fragments.definitions.iter())
        {
            register(&definition.id, "NamedPromptFragment");
        }
    }
    for generator in &generators.prompt_generators {
        register(&generator.id, "PromptGenerator");
        for slot in &generator.preset_slots {
            register(&slot.id, "PresetSlot");
        }
    }
    drop(register);

    for attribute in &data.attributes {
        for implied in &attribute.implies {
            if !attr_ids.contains(implied) {
                errors.push(format!(
                    "Attribute {} implies missing Attribute {implied}",
                    attribute.id
                ));
            }
        }
    }
    let attribute_edges: HashMap<String, Vec<String>> = data
        .attributes
        .iter()
        .map(|attribute| (attribute.id.clone(), attribute.implies.clone()))
        .collect();
    fn attribute_cycle(
        id: &str,
        edges: &HashMap<String, Vec<String>>,
        visiting: &mut HashSet<String>,
        done: &mut HashSet<String>,
    ) -> bool {
        if visiting.contains(id) {
            return true;
        }
        if done.contains(id) {
            return false;
        }
        visiting.insert(id.to_string());
        let found = edges
            .get(id)
            .into_iter()
            .flatten()
            .any(|next| attribute_cycle(next, edges, visiting, done));
        visiting.remove(id);
        done.insert(id.to_string());
        found
    }
    let mut done = HashSet::new();
    for id in attribute_edges.keys() {
        if attribute_cycle(id, &attribute_edges, &mut HashSet::new(), &mut done) {
            errors.push("Attribute implies cycle".into());
            break;
        }
    }

    for category in &data.categories {
        for id in &category.attribute_ids {
            if !attr_ids.contains(id) {
                errors.push(format!(
                    "Category {} references missing Attribute {id}",
                    category.id
                ));
            }
        }
    }

    for concept in &data.concepts {
        if !category_ids.contains(&concept.category_id) {
            errors.push(format!(
                "Concept {} has missing Category {}",
                concept.id, concept.category_id
            ));
        }
        for id in &concept.attribute_ids {
            if !attr_ids.contains(id) {
                errors.push(format!(
                    "Concept {} references missing Attribute {id}",
                    concept.id
                ));
            }
        }
        for group in &concept.variant_groups {
            if group.min_selections > group.variants.len()
                || group
                    .max_selections
                    .is_some_and(|max| max < group.min_selections)
            {
                errors.push(format!(
                    "VariantGroup {} has invalid selection limits",
                    group.id
                ));
            }
            for variant in &group.variants {
                for id in &variant.attribute_ids {
                    if !attr_ids.contains(id) {
                        errors.push(format!(
                            "Variant {} references missing Attribute {id}",
                            variant.id
                        ));
                    }
                }
            }
        }
        for preset in &concept.presets {
            let mut used_groups = HashSet::<String>::new();
            for selection in &preset.variant_selections {
                if !used_groups.insert(selection.group_id.clone()) {
                    errors.push(format!(
                        "Preset {} repeats VariantGroup {}",
                        preset.id, selection.group_id
                    ));
                }
                let Some(group) = concept
                    .variant_groups
                    .iter()
                    .find(|group| group.id == selection.group_id)
                else {
                    errors.push(format!(
                        "Preset {} references missing or foreign VariantGroup {}",
                        preset.id, selection.group_id
                    ));
                    continue;
                };
                let unique: HashSet<&String> = selection.variant_ids.iter().collect();
                if unique.len() != selection.variant_ids.len() {
                    errors.push(format!(
                        "Preset {} has duplicate Variant in group {}",
                        preset.id, group.id
                    ));
                }
                if selection
                    .variant_ids
                    .iter()
                    .any(|id| !group.variants.iter().any(|variant| variant.id == *id))
                {
                    errors.push(format!(
                        "Preset {} references invalid Variant in group {}",
                        preset.id, group.id
                    ));
                }
                if selection.variant_ids.len() < group.min_selections
                    || group
                        .max_selections
                        .is_some_and(|max| selection.variant_ids.len() > max)
                {
                    errors.push(format!(
                        "Preset {} violates VariantGroup {} selection rules",
                        preset.id, group.id
                    ));
                }
            }
            for group in &concept.variant_groups {
                if group.min_selections > 0 && !used_groups.contains(&group.id) {
                    errors.push(format!(
                        "Preset {} misses required VariantGroup {}",
                        preset.id, group.id
                    ));
                }
            }
        }
        validate_fragment_set(
            &concept.prompt_fragments,
            "promptFragments",
            &category_ids,
            &attr_ids,
            &concept_ids,
            &preset_ids,
            &group_owner,
            &variant_group,
            &mut errors,
        );
        validate_fragment_set(
            &concept.negative_prompt_fragments,
            "negativePromptFragments",
            &category_ids,
            &attr_ids,
            &concept_ids,
            &preset_ids,
            &group_owner,
            &variant_group,
            &mut errors,
        );
    }

    for generator in &generators.prompt_generators {
        for slot in &generator.preset_slots {
            if let Some(preset_id) = &slot.preset_id {
                if !preset_ids.contains(preset_id) {
                    errors.push(format!(
                        "PromptGenerator {} references missing Preset {preset_id}",
                        generator.id
                    ));
                }
            }
        }
    }
    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors.join("\n"))
    }
}

fn validate_fragment_set(
    set: &PromptFragmentSet,
    label: &str,
    category_ids: &HashSet<String>,
    attr_ids: &HashSet<String>,
    concept_ids: &HashSet<String>,
    preset_ids: &HashSet<String>,
    group_owner: &HashMap<String, String>,
    variant_group: &HashMap<String, String>,
    errors: &mut Vec<String>,
) {
    let definition_ids: HashSet<String> = set
        .definitions
        .iter()
        .map(|definition| definition.id.clone())
        .collect();
    let mut names = HashSet::<String>::new();
    for definition in &set.definitions {
        if definition.name.trim().is_empty() {
            errors.push(format!("{label}: named fragment must have a name"));
        }
        if !names.insert(definition.name.clone()) {
            errors.push(format!(
                "{label}: duplicate named fragment name {}",
                definition.name
            ));
        }
        validate_condition(
            &definition.condition,
            category_ids,
            attr_ids,
            concept_ids,
            preset_ids,
            group_owner,
            variant_group,
            errors,
        );
        validate_sequence(&definition.fragments, &definition_ids, label, errors);
    }
    validate_sequence(&set.root, &definition_ids, label, errors);
    let by_id: HashMap<String, &crate::model::NamedPromptFragment> = set
        .definitions
        .iter()
        .map(|definition| (definition.id.clone(), definition))
        .collect();
    fn visit(
        id: &str,
        by_id: &HashMap<String, &crate::model::NamedPromptFragment>,
        visiting: &mut HashSet<String>,
        done: &mut HashSet<String>,
    ) -> bool {
        if visiting.contains(id) {
            return true;
        }
        if done.contains(id) {
            return false;
        }
        visiting.insert(id.to_string());
        let found = by_id
            .get(id)
            .into_iter()
            .flat_map(|definition| definition.fragments.iter())
            .filter_map(|fragment| match fragment {
                PromptFragment::Reference(reference) => Some(reference.fragment_id.as_str()),
                PromptFragment::Tag(_) => None,
            })
            .any(|next| visit(next, by_id, visiting, done));
        visiting.remove(id);
        done.insert(id.to_string());
        found
    }
    let mut done = HashSet::new();
    for id in by_id.keys() {
        if visit(id, &by_id, &mut HashSet::new(), &mut done) {
            errors.push(format!("{label}: named fragment reference cycle"));
            break;
        }
    }
}

fn validate_sequence(
    fragments: &[PromptFragment],
    definition_ids: &HashSet<String>,
    label: &str,
    errors: &mut Vec<String>,
) {
    for fragment in fragments {
        match fragment {
            PromptFragment::Tag(tag) if tag.trim().is_empty() => {
                errors.push(format!("{label}: whitespace-only Tag"))
            }
            PromptFragment::Reference(reference)
                if !definition_ids.contains(&reference.fragment_id) =>
            {
                errors.push(format!(
                    "{label}: missing named fragment {}",
                    reference.fragment_id
                ))
            }
            _ => {}
        }
    }
}

fn validate_condition(
    condition: &Condition,
    category_ids: &HashSet<String>,
    attr_ids: &HashSet<String>,
    concept_ids: &HashSet<String>,
    preset_ids: &HashSet<String>,
    group_owner: &HashMap<String, String>,
    variant_group: &HashMap<String, String>,
    errors: &mut Vec<String>,
) {
    match condition {
        Condition::All { all } => {
            if all.is_empty() {
                errors.push("Empty all Condition".into());
            }
            for child in all {
                validate_condition(
                    child,
                    category_ids,
                    attr_ids,
                    concept_ids,
                    preset_ids,
                    group_owner,
                    variant_group,
                    errors,
                );
            }
        }
        Condition::Any { any } => {
            if any.is_empty() {
                errors.push("Empty any Condition".into());
            }
            for child in any {
                validate_condition(
                    child,
                    category_ids,
                    attr_ids,
                    concept_ids,
                    preset_ids,
                    group_owner,
                    variant_group,
                    errors,
                );
            }
        }
        Condition::Category { category } => {
            if !category_ids.contains(&category.category_id) {
                errors.push(format!(
                    "Condition references missing Category {}",
                    category.category_id
                ));
            }
            match category.operator {
                CompareOperator::Is | CompareOperator::IsNot => {}
            }
        }
        Condition::Attribute { attribute } => {
            if !attr_ids.contains(&attribute.attribute_id) {
                errors.push(format!(
                    "Condition references missing Attribute {}",
                    attribute.attribute_id
                ));
            }
            match attribute.operator {
                CompareOperator::Is | CompareOperator::IsNot => {}
            }
        }
        Condition::Preset { preset } => {
            if !preset_ids.contains(&preset.preset_id) {
                errors.push(format!(
                    "Condition references missing Preset {}",
                    preset.preset_id
                ));
            }
            match preset.operator {
                CompareOperator::Is | CompareOperator::IsNot => {}
            }
        }
        Condition::Concept { concept } => {
            if !concept_ids.contains(&concept.concept_id) {
                errors.push(format!(
                    "Condition references missing Concept {}",
                    concept.concept_id
                ));
            }
            match concept.operator {
                ConceptConditionOperator::Is | ConceptConditionOperator::IsNot => {
                    if concept
                        .variants
                        .as_ref()
                        .is_some_and(|items| !items.is_empty())
                    {
                        errors.push("Concept is/isNot condition must not contain variants".into());
                    }
                }
                ConceptConditionOperator::VariantsMatch
                | ConceptConditionOperator::VariantsDoNotMatch => {
                    let Some(requirements) = &concept.variants else {
                        errors
                            .push("Concept variant condition requires at least one Variant".into());
                        return;
                    };
                    if requirements.is_empty() {
                        errors
                            .push("Concept variant condition requires at least one Variant".into());
                    }
                    for requirement in requirements {
                        if group_owner.get(&requirement.group_id) != Some(&concept.concept_id)
                            || variant_group.get(&requirement.variant_id)
                                != Some(&requirement.group_id)
                        {
                            errors.push("Condition references missing or foreign Variant".into());
                        }
                    }
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    fn valid() -> (Value, Value) {
        (
            json!({"schemaVersion":2,"attributes":[],"categories":[{"id":"cat","name":"c","attributeIds":[],"backgroundColor":"","color":""}],"concepts":[{"id":"con","name":"c","categoryId":"cat","attributeIds":[],"variantGroups":[],"presets":[{"id":"pre","name":"p","variantSelections":[]}],"promptFragments":{"root":[],"definitions":[]},"negativePromptFragments":{"root":[],"definitions":[]}}]}),
            json!({"schemaVersion":2,"promptGenerators":[]}),
        )
    }
    #[test]
    fn rejects_attribute_cycle_and_dangling_category() {
        let (mut data, generators) = valid();
        data["attributes"] =
            json!([{"id":"a","name":"a","implies":["b"]},{"id":"b","name":"b","implies":["a"]}]);
        assert!(validate_pair(&data, &generators)
            .unwrap_err()
            .contains("cycle"));
        let (mut data, generators) = valid();
        data["concepts"][0]["categoryId"] = json!("absent");
        assert!(validate_pair(&data, &generators)
            .unwrap_err()
            .contains("missing Category"));
    }
    #[test]
    fn rejects_named_fragment_cycle() {
        let (mut data, generators) = valid();
        data["concepts"][0]["promptFragments"] = json!({"root":[{"fragmentId":"a"}],"definitions":[{"id":"a","name":"A","if":{"category":{"categoryId":"cat","operator":"is"}},"fragments":[{"fragmentId":"b"}]},{"id":"b","name":"B","if":{"category":{"categoryId":"cat","operator":"is"}},"fragments":[{"fragmentId":"a"}]}]});
        assert!(validate_pair(&data, &generators)
            .unwrap_err()
            .contains("reference cycle"));
    }
    #[test]
    fn rejects_missing_preset_condition() {
        let (mut data, generators) = valid();
        data["concepts"][0]["promptFragments"] = json!({"root":[{"fragmentId":"f"}],"definitions":[{"id":"f","name":"F","if":{"preset":{"presetId":"missing","operator":"is"}},"fragments":["x"]}]});
        assert!(validate_pair(&data, &generators)
            .unwrap_err()
            .contains("missing Preset"));
    }
}
