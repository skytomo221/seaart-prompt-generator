import { Condition, Data, Id, InstanceExistence, Preset, PromptFragment, PromptFragmentSet, PromptGenerator, ResolvedConceptInstance, VariantRequirement } from "../data";
import { findPreset } from "./presets";

export interface RuntimeInstance {
  key: string;
  slotId: Id;
  instance: ResolvedConceptInstance;
  preset: Preset;
  concept: Data["concepts"][number];
}

export function expandPresets(generator: PromptGenerator, data: Data): RuntimeInstance[] {
  const result: RuntimeInstance[] = [];
  for (const slot of generator.presetSlots) {
    if (!slot.presetId) continue;
    const resolved = findPreset(data, slot.presetId);
    if (!resolved) continue;
    const instance: ResolvedConceptInstance = {
      id: slot.id,
      conceptId: resolved.concept.id,
      presetId: resolved.preset.id,
      variantSelections: resolved.preset.variantSelections,
    };
    result.push({ key: slot.id, slotId: slot.id, instance, preset: resolved.preset, concept: resolved.concept });
  }
  return result;
}

export function getEffectiveAttributes(item: RuntimeInstance, data: Data): Set<Id> {
  const ids = new Set<Id>();
  const category = data.categories.find(candidate => candidate.id === item.concept.categoryId);
  category?.attributeIds.forEach(id => ids.add(id));
  item.concept.attributeIds.forEach(id => ids.add(id));
  for (const selection of item.instance.variantSelections) {
    const group = item.concept.variantGroups.find(candidate => candidate.id === selection.groupId);
    for (const id of selection.variantIds) {
      group?.variants.find(variant => variant.id === id)?.attributeIds.forEach(attributeId => ids.add(attributeId));
    }
  }
  const pending = [...ids];
  while (pending.length) {
    const current = pending.pop()!;
    for (const implied of data.attributes.find(attribute => attribute.id === current)?.implies ?? []) {
      if (!ids.has(implied)) {
        ids.add(implied);
        pending.push(implied);
      }
    }
  }
  return ids;
}

function matchesVariantRequirements(item: RuntimeInstance, requirements: VariantRequirement[]): boolean {
  return requirements.every(requirement => item.instance.variantSelections
    .find(selection => selection.groupId === requirement.groupId)
    ?.variantIds.includes(requirement.variantId) === true);
}

function applyExistence(matched: boolean, existence: InstanceExistence): boolean {
  return existence === "exists" ? matched : !matched;
}

export function evaluateCondition(condition: Condition, environment: RuntimeInstance[], data: Data): boolean {
  if ("all" in condition) return condition.all.every(child => evaluateCondition(child, environment, data));
  if ("any" in condition) return condition.any.some(child => evaluateCondition(child, environment, data));
  if ("category" in condition) {
    const matched = environment.some(item => {
      const equal = item.concept.categoryId === condition.category.categoryId;
      return condition.category.operator === "is" ? equal : !equal;
    });
    return applyExistence(matched, condition.category.existence);
  }
  if ("attribute" in condition) {
    const matched = environment.some(item => {
      const equal = getEffectiveAttributes(item, data).has(condition.attribute.attributeId);
      return condition.attribute.operator === "is" ? equal : !equal;
    });
    return applyExistence(matched, condition.attribute.existence);
  }
  if ("preset" in condition) {
    const matched = environment.some(item => {
      const equal = item.preset.id === condition.preset.presetId;
      return condition.preset.operator === "is" ? equal : !equal;
    });
    return applyExistence(matched, condition.preset.existence);
  }

  const requirements = condition.concept.variants ?? [];
  const matched = environment.some(item => {
    const sameConcept = item.concept.id === condition.concept.conceptId;
    if (condition.concept.operator === "is") return sameConcept;
    if (condition.concept.operator === "isNot") return !sameConcept;
    if (!sameConcept) return false;
    const variantsMatch = matchesVariantRequirements(item, requirements);
    return condition.concept.operator === "variantsMatch" ? variantsMatch : !variantsMatch;
  });
  return applyExistence(matched, condition.concept.existence);
}

export function evaluateFragments(
  fragments: PromptFragment[],
  set: PromptFragmentSet,
  environment: RuntimeInstance[],
  data: Data,
  resolving: ReadonlySet<Id> = new Set(),
): string[] {
  const output: string[] = [];
  for (const fragment of fragments) {
    if (typeof fragment === "string") {
      output.push(fragment);
      continue;
    }
    const definition = set.definitions.find(candidate => candidate.id === fragment.fragmentId);
    if (!definition || resolving.has(definition.id) || !evaluateCondition(definition.if, environment, data)) continue;
    const nextResolving = new Set(resolving);
    nextResolving.add(definition.id);
    output.push(...evaluateFragments(definition.fragments, set, environment, data, nextResolving));
  }
  return output;
}

export function evaluateConceptInstance(
  self: RuntimeInstance,
  environment: RuntimeInstance[],
  data: Data,
  negative = false,
): string[] {
  const set = negative ? self.concept.negativePromptFragments : self.concept.promptFragments;
  return evaluateFragments(set.root, set, environment, data);
}

export function evaluatePrompt(generator: PromptGenerator, data: Data) {
  const environment = expandPresets(generator, data);
  const positive: string[] = [];
  const negative: string[] = [];
  for (const item of environment) {
    positive.push(...evaluateConceptInstance(item, environment, data));
    negative.push(...evaluateConceptInstance(item, environment, data, true));
  }
  return { prompt: positive.join(","), negativePrompt: negative.join(","), environment };
}

export function parseTags(input: string): string[] {
  return input.split(",").map(tag => tag.trim()).filter(Boolean);
}
