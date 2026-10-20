use serde::{Deserialize, Serialize};

pub type Id = String;
pub type Tag = String;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Data {
    pub schema_version: u8,
    pub attributes: Vec<Attribute>,
    pub categories: Vec<Category>,
    pub concepts: Vec<Concept>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Attribute {
    pub id: Id,
    pub name: String,
    pub implies: Vec<Id>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Category {
    pub id: Id,
    pub name: String,
    pub attribute_ids: Vec<Id>,
    pub background_color: String,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Concept {
    pub id: Id,
    pub name: String,
    pub category_id: Id,
    pub attribute_ids: Vec<Id>,
    pub variant_groups: Vec<VariantGroup>,
    pub presets: Vec<Preset>,
    pub prompt_fragments: PromptFragmentSet,
    pub negative_prompt_fragments: PromptFragmentSet,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct VariantGroup {
    pub id: Id,
    pub name: String,
    pub variants: Vec<Variant>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Variant {
    pub id: Id,
    pub name: String,
    pub attribute_ids: Vec<Id>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct VariantSelection {
    pub group_id: Id,
    pub variant_id: Id,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Preset {
    pub id: Id,
    pub name: String,
    pub variant_selections: Vec<VariantSelection>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PromptFragmentSet {
    pub root: Vec<PromptFragment>,
    pub definitions: Vec<NamedPromptFragment>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NamedPromptFragment {
    pub id: Id,
    pub name: String,
    #[serde(rename = "if")]
    pub condition: Condition,
    pub fragments: Vec<PromptFragment>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FragmentReference {
    pub fragment_id: Id,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum PromptFragment {
    Tag(Tag),
    Reference(FragmentReference),
    Template(FragmentTemplate),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FragmentTemplate {
    pub parts: Vec<FragmentTemplatePart>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum FragmentTemplatePart {
    Text(String),
    Reference(FragmentReference),
}

impl PromptFragment {
    pub fn references(&self) -> Vec<&FragmentReference> {
        match self {
            Self::Tag(_) => vec![],
            Self::Reference(reference) => vec![reference],
            Self::Template(template) => template
                .parts
                .iter()
                .filter_map(|part| match part {
                    FragmentTemplatePart::Text(_) => None,
                    FragmentTemplatePart::Reference(reference) => Some(reference),
                })
                .collect(),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CompareOperator {
    #[serde(rename = "is")]
    Is,
    #[serde(rename = "isNot")]
    IsNot,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum InstanceExistence {
    #[default]
    #[serde(rename = "exists")]
    Exists,
    #[serde(rename = "notExists")]
    NotExists,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ConceptConditionOperator {
    #[serde(rename = "is")]
    Is,
    #[serde(rename = "isNot")]
    IsNot,
    #[serde(rename = "variantsMatch")]
    VariantsMatch,
    #[serde(rename = "variantsDoNotMatch")]
    VariantsDoNotMatch,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CategoryCondition {
    pub category_id: Id,
    pub operator: CompareOperator,
    #[serde(default)]
    pub existence: InstanceExistence,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AttributeCondition {
    pub attribute_id: Id,
    pub operator: CompareOperator,
    #[serde(default)]
    pub existence: InstanceExistence,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PresetCondition {
    pub preset_id: Id,
    pub operator: CompareOperator,
    #[serde(default)]
    pub existence: InstanceExistence,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct VariantRequirement {
    pub group_id: Id,
    pub variant_id: Id,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct VariantFragmentCase {
    pub variant_id: Id,
    pub fragments: Vec<PromptFragment>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SelfVariantGroupCondition {
    pub group_id: Id,
    pub cases: Vec<VariantFragmentCase>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ConceptCondition {
    pub concept_id: Id,
    pub operator: ConceptConditionOperator,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub variants: Option<Vec<VariantRequirement>>,
    #[serde(default)]
    pub existence: InstanceExistence,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Condition {
    All { all: Vec<Condition> },
    Any { any: Vec<Condition> },
    Category { category: CategoryCondition },
    Attribute { attribute: AttributeCondition },
    Preset { preset: PresetCondition },
    Concept { concept: ConceptCondition },
    SelfVariantGroup {
        #[serde(rename = "selfVariantGroup")]
        self_variant_group: SelfVariantGroupCondition,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ConceptInstance {
    pub id: Id,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub concept_id: Option<Id>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub preset_id: Option<Id>,
    pub variant_selections: Vec<VariantSelection>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PromptGenerator {
    pub id: Id,
    pub instances: Vec<ConceptInstance>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PromptGeneratorsData {
    pub schema_version: u8,
    pub prompt_generators: Vec<PromptGenerator>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    #[test]
    fn serde_round_trips_inline_and_legacy_fragments() {
        let input = json!(["legacy", {"fragmentId":"f"},
            {"parts":["cute ", {"fragmentId":"f"}, " ", {"fragmentId":"g"}, " panties"]}]);
        let fragments: Vec<PromptFragment> = serde_json::from_value(input.clone()).unwrap();
        assert_eq!(serde_json::to_value(&fragments).unwrap(), input);
        assert_eq!(fragments[2].references().len(), 2);
        assert!(serde_json::from_value::<PromptFragment>(json!({"parts":[{"parts":[]}]})).is_err());
    }

    #[test]
    fn serde_uses_named_fragment_and_explicit_existence() {
        let v: PromptFragmentSet = serde_json::from_value(json!({
            "root": ["a", {"fragmentId":"f"}],
            "definitions": [{"id":"f","name":"デフォルト服","if":{"category":{"categoryId":"cat","operator":"is","existence":"notExists"}},"fragments":["b"]}]
        })).unwrap();
        let out = serde_json::to_value(v).unwrap();
        assert_eq!(out["root"][1]["fragmentId"], "f");
        assert_eq!(out["definitions"][0]["if"]["category"]["operator"], "is");
        assert_eq!(
            out["definitions"][0]["if"]["category"]["existence"],
            "notExists"
        );
    }

    #[test]
    fn serde_supports_self_variant_group_condition() {
        let v: PromptFragmentSet = serde_json::from_value(json!({
            "root": [{"fragmentId":"f"}],
            "definitions": [{
                "id":"f",
                "name":"制服",
                "if":{"selfVariantGroup":{"groupId":"uniform","cases":[{"variantId":"summer","fragments":["summer uniform"]}]}},
                "fragments":[]
            }]
        })).unwrap();
        let out = serde_json::to_value(v).unwrap();
        assert_eq!(
            out["definitions"][0]["if"]["selfVariantGroup"]["groupId"],
            "uniform"
        );
        assert_eq!(
            out["definitions"][0]["if"]["selfVariantGroup"]["cases"][0]["variantId"],
            "summer"
        );
    }
}
