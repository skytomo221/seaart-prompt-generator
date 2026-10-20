use crate::model::{
    CompareOperator, Concept, ConceptConditionOperator, Condition, Data, PromptFragment,
    PromptFragmentSet, PromptGeneratorsData, VariantSelection,
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
        for instance in &generator.instances {
            register(&instance.id, "ConceptInstance");
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
            validate_selections(
                &format!("Preset {}", preset.id),
                concept,
                &preset.variant_selections,
                &mut errors,
            );
        }
        validate_fragment_set(
            &concept.prompt_fragments,
            "promptFragments",
            concept,
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
            concept,
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
        for instance in &generator.instances {
            match (&instance.concept_id, &instance.preset_id) {
                (None, None) => {
                    if !instance.variant_selections.is_empty() {
                        errors.push(format!(
                            "Instance {} has variants without a concept",
                            instance.id
                        ));
                    }
                }
                (Some(concept_id), Some(preset_id)) => {
                    let Some(concept) = data.concepts.iter().find(|item| item.id == *concept_id)
                    else {
                        errors.push(format!(
                            "Instance {} references missing Concept {concept_id}",
                            instance.id
                        ));
                        continue;
                    };
                    if !concept.presets.iter().any(|preset| preset.id == *preset_id) {
                        errors.push(format!(
                            "Instance {} references missing or foreign Preset {preset_id}",
                            instance.id
                        ));
                    }
                    validate_selections(
                        &format!("Instance {}", instance.id),
                        concept,
                        &instance.variant_selections,
                        &mut errors,
                    );
                }
                _ => errors.push(format!(
                    "Instance {} must have conceptId and presetId together",
                    instance.id
                )),
            }
        }
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors.join("\n"))
    }
}

fn validate_selections(
    owner: &str,
    concept: &Concept,
    selections: &[VariantSelection],
    errors: &mut Vec<String>,
) {
    let mut used_groups = HashSet::<String>::new();
    for selection in selections {
        if !used_groups.insert(selection.group_id.clone()) {
            errors.push(format!(
                "{owner} repeats VariantGroup {}",
                selection.group_id
            ));
        }
        let Some(group) = concept
            .variant_groups
            .iter()
            .find(|group| group.id == selection.group_id)
        else {
            errors.push(format!(
                "{owner} references missing or foreign VariantGroup {}",
                selection.group_id
            ));
            continue;
        };
        if !group
            .variants
            .iter()
            .any(|variant| variant.id == selection.variant_id)
        {
            errors.push(format!(
                "{owner} references invalid Variant in group {}",
                group.id
            ));
        }
    }
}

fn validate_fragment_set(
    set: &PromptFragmentSet,
    label: &str,
    owner_concept: &Concept,
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
        match &definition.condition {
            Condition::SelfVariantGroup { self_variant_group } => {
                let Some(group) = owner_concept
                    .variant_groups
                    .iter()
                    .find(|group| group.id == self_variant_group.group_id)
                else {
                    errors.push(format!(
                        "{label}: selfVariantGroup references missing or foreign VariantGroup {}",
                        self_variant_group.group_id
                    ));
                    continue;
                };
                if !definition.fragments.is_empty() {
                    errors.push(format!(
                        "{label}: selfVariantGroup definition fragments must be empty"
                    ));
                }
                let mut seen = HashSet::<String>::new();
                for variant_case in &self_variant_group.cases {
                    if !seen.insert(variant_case.variant_id.clone()) {
                        errors.push(format!(
                            "{label}: duplicate selfVariantGroup case {}",
                            variant_case.variant_id
                        ));
                    }
                    if !group
                        .variants
                        .iter()
                        .any(|variant| variant.id == variant_case.variant_id)
                    {
                        errors.push(format!(
                            "{label}: selfVariantGroup case references missing or foreign Variant {}",
                            variant_case.variant_id
                        ));
                    }
                    validate_sequence(&variant_case.fragments, &definition_ids, label, errors);
                }
            }
            condition => {
                validate_condition(
                    condition,
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
        }
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
        let found = if let Some(definition) = by_id.get(id) {
            match &definition.condition {
                Condition::SelfVariantGroup { self_variant_group } => self_variant_group
                    .cases
                    .iter()
                    .flat_map(|variant_case| variant_case.fragments.iter())
                    .flat_map(PromptFragment::references)
                    .map(|reference| reference.fragment_id.as_str())
                    .any(|next| visit(next, by_id, visiting, done)),
                _ => definition
                    .fragments
                    .iter()
                    .flat_map(PromptFragment::references)
                    .map(|reference| reference.fragment_id.as_str())
                    .any(|next| visit(next, by_id, visiting, done)),
            }
        } else {
            false
        };
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
        if let PromptFragment::Tag(tag) = fragment {
            if tag.trim().is_empty() {
                errors.push(format!("{label}: whitespace-only Tag"));
            }
        }
        for reference in fragment.references() {
            if !definition_ids.contains(&reference.fragment_id) {
                errors.push(format!(
                    "{label}: missing named fragment {}",
                    reference.fragment_id
                ));
            }
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
        Condition::SelfVariantGroup { .. } => errors.push(
            "selfVariantGroup is only valid as the top-level named fragment condition".into(),
        ),
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
    fn validates_inline_references_and_cycles_in_both_prompt_sets() {
        for key in ["promptFragments", "negativePromptFragments"] {
            let (mut data, generators) = valid();
            data["concepts"][0][key] = json!({
                "root":[{"parts":[{"fragmentId":"a"}, " panties"]}],
                "definitions":[
                    {"id":"a","name":"A","if":{"category":{"categoryId":"cat","operator":"is","existence":"notExists"}},"fragments":["white"]},
                    {"id":"b","name":"B","if":{"category":{"categoryId":"cat","operator":"is","existence":"notExists"}},"fragments":[{"parts":["x ",{"fragmentId":"a"}]}]}
                ]
            });
            assert!(validate_pair(&data, &generators).is_ok());
            data["concepts"][0][key]["root"][0]["parts"][0]["fragmentId"] = json!("missing");
            assert!(validate_pair(&data, &generators)
                .unwrap_err()
                .contains("missing named fragment missing"));
            data["concepts"][0][key]["root"][0]["parts"][0]["fragmentId"] = json!("a");
            data["concepts"][0][key]["definitions"][0]["fragments"] =
                json!([{"parts":[{"fragmentId":"b"}, " y"]}]);
            assert!(validate_pair(&data, &generators)
                .unwrap_err()
                .contains("named fragment reference cycle"));
        }
    }

    #[test]
    fn rejects_missing_instance_preset() {
        let (data, mut generators) = valid();
        generators["promptGenerators"] = json!([{"id":"g","instances":[{"id":"i","conceptId":"con","presetId":"missing","variantSelections":[]}]}]);
        assert!(validate_pair(&data, &generators)
            .unwrap_err()
            .contains("missing or foreign Preset"));
    }

    #[test]
    fn accepts_independent_instance_variant() {
        let (mut data, mut generators) = valid();
        data["concepts"][0]["variantGroups"] = json!([{"id":"uniform","name":"制服","variants":[{"id":"summer","name":"夏服","attributeIds":[]},{"id":"winter","name":"冬服","attributeIds":[]}]}]);
        data["concepts"][0]["presets"][0]["variantSelections"] =
            json!([{"groupId":"uniform","variantId":"summer"}]);
        generators["promptGenerators"] = json!([{"id":"g","instances":[{"id":"i","conceptId":"con","presetId":"pre","variantSelections":[{"groupId":"uniform","variantId":"winter"}]}]}]);
        assert!(validate_pair(&data, &generators).is_ok());
    }

    #[test]
    fn accepts_self_variant_group_fragment_condition() {
        let (mut data, generators) = valid();
        data["concepts"][0]["variantGroups"] = json!([{"id":"uniform","name":"制服","variants":[{"id":"summer","name":"夏服","attributeIds":[]},{"id":"winter","name":"冬服","attributeIds":[]}]}]);
        data["concepts"][0]["promptFragments"] = json!({
            "root":[{"fragmentId":"uniform-fragment"}],
            "definitions":[{
                "id":"uniform-fragment",
                "name":"制服",
                "if":{"selfVariantGroup":{"groupId":"uniform","cases":[
                    {"variantId":"summer","fragments":["summer uniform"]},
                    {"variantId":"winter","fragments":["winter uniform"]}
                ]}},
                "fragments":[]
            }]
        });
        assert!(validate_pair(&data, &generators).is_ok());
    }
}
