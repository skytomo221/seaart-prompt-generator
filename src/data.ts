export type Id = string;
export type Tag = string;

export interface Attribute { id: Id; name: string; implies: Id[] }
export interface Category { id: Id; name: string; attributeIds: Id[]; backgroundColor: string; color: string }
export interface Variant { id: Id; name: string; attributeIds: Id[] }
export interface VariantGroup { id: Id; name: string; minSelections: number; maxSelections?: number; variants: Variant[] }
export interface VariantSelection { groupId: Id; variantIds: Id[] }
export interface Preset { id: Id; name: string; variantSelections: VariantSelection[] }

export interface FragmentReference { fragmentId: Id }
export type PromptFragment = Tag | FragmentReference;
export interface PromptFragmentSet { root: PromptFragment[]; definitions: NamedPromptFragment[] }
export interface NamedPromptFragment { id: Id; name: string; if: Condition; fragments: PromptFragment[] }

export type CompareOperator = "is" | "isNot";
export type InstanceExistence = "exists" | "notExists";
export interface VariantRequirement { groupId: Id; variantId: Id }
export type ConceptConditionOperator = "is" | "isNot" | "variantsMatch" | "variantsDoNotMatch";
export interface CategoryCondition { categoryId: Id; operator: CompareOperator; existence: InstanceExistence }
export interface AttributeCondition { attributeId: Id; operator: CompareOperator; existence: InstanceExistence }
export interface PresetCondition { presetId: Id; operator: CompareOperator; existence: InstanceExistence }
export interface ConceptCondition { conceptId: Id; operator: ConceptConditionOperator; variants?: VariantRequirement[]; existence: InstanceExistence }
export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { category: CategoryCondition }
  | { attribute: AttributeCondition }
  | { preset: PresetCondition }
  | { concept: ConceptCondition };

export interface Concept {
  id: Id;
  name: string;
  categoryId: Id;
  attributeIds: Id[];
  variantGroups: VariantGroup[];
  presets: Preset[];
  promptFragments: PromptFragmentSet;
  negativePromptFragments: PromptFragmentSet;
}

export interface Data { schemaVersion: 2; attributes: Attribute[]; categories: Category[]; concepts: Concept[] }
export interface ResolvedConceptInstance { id: Id; conceptId: Id; presetId: Id; variantSelections: VariantSelection[] }
export interface PresetSlot { id: Id; presetId?: Id }
export interface PromptGenerator { id: Id; presetSlots: PresetSlot[] }
export interface PromptGeneratorsData { schemaVersion: 2; promptGenerators: PromptGenerator[] }
