import { Attribute, Category, Condition, Concept } from "../data";

export function createInitialCondition(concepts: Concept[], categories: Category[], attributes: Attribute[]): Condition | undefined {
  if (categories[0]) return { category: { categoryId: categories[0].id, operator: "is", existence: "exists" } };
  if (concepts[0]) return { concept: { conceptId: concepts[0].id, operator: "is", existence: "exists" } };
  const preset = concepts.flatMap(concept => concept.presets.map(item => ({ concept, item })))[0];
  if (preset) return { preset: { presetId: preset.item.id, operator: "is", existence: "exists" } };
  if (attributes[0]) return { attribute: { attributeId: attributes[0].id, operator: "is", existence: "exists" } };
  return undefined;
}
