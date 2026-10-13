import {
  Condition,
  ConceptInstance,
  Data,
  Id,
  InstanceExistence,
  Preset,
  PromptFragment,
  PromptFragmentSet,
  PromptGenerator,
  VariantRequirement,
} from "../data";
import { findPreset } from "./presets";

export interface RuntimeInstance {
  key: string;
  instance: ConceptInstance;
  preset: Preset;
  concept: Data["concepts"][number];
}

export function resolveInstances(
  generator: PromptGenerator,
  data: Data,
): RuntimeInstance[] {
  const result: RuntimeInstance[] = [];
  for (const instance of generator.instances) {
    if (!instance.conceptId || !instance.presetId) continue;
    const concept = data.concepts.find((item) => item.id === instance.conceptId);
    const resolved = findPreset(data, instance.presetId);
    if (!concept || !resolved || resolved.concept.id !== concept.id) continue;
    result.push({
      key: instance.id,
      instance,
      preset: resolved.preset,
      concept,
    });
  }
  return result;
}

export function getEffectiveAttributes(
  item: RuntimeInstance,
  data: Data,
): Set<Id> {
  const ids = new Set<Id>();
  const category = data.categories.find(
    (candidate) => candidate.id === item.concept.categoryId,
  );
  category?.attributeIds.forEach((id) => ids.add(id));
  item.concept.attributeIds.forEach((id) => ids.add(id));
  for (const selection of item.instance.variantSelections) {
    const group = item.concept.variantGroups.find(
      (candidate) => candidate.id === selection.groupId,
    );
    group?.variants
      .find((variant) => variant.id === selection.variantId)
      ?.attributeIds.forEach((attributeId) => ids.add(attributeId));
  }
  const pending = [...ids];
  while (pending.length) {
    const current = pending.pop()!;
    for (const implied of data.attributes.find(
      (attribute) => attribute.id === current,
    )?.implies ?? []) {
      if (!ids.has(implied)) {
        ids.add(implied);
        pending.push(implied);
      }
    }
  }
  return ids;
}

function matchesVariantRequirements(
  item: RuntimeInstance,
  requirements: VariantRequirement[],
): boolean {
  return requirements.every(
    (requirement) =>
      item.instance.variantSelections.find(
        (selection) => selection.groupId === requirement.groupId,
      )?.variantId === requirement.variantId,
  );
}

function applyExistence(
  matched: boolean,
  existence: InstanceExistence,
): boolean {
  return existence === "exists" ? matched : !matched;
}

export function evaluateCondition(
  condition: Condition,
  environment: RuntimeInstance[],
  data: Data,
): boolean {
  if ("all" in condition)
    return condition.all.every((child) =>
      evaluateCondition(child, environment, data),
    );
  if ("any" in condition)
    return condition.any.some((child) =>
      evaluateCondition(child, environment, data),
    );
  if ("category" in condition) {
    const matched = environment.some((item) => {
      const equal = item.concept.categoryId === condition.category.categoryId;
      return condition.category.operator === "is" ? equal : !equal;
    });
    return applyExistence(matched, condition.category.existence);
  }
  if ("attribute" in condition) {
    const matched = environment.some((item) => {
      const equal = getEffectiveAttributes(item, data).has(
        condition.attribute.attributeId,
      );
      return condition.attribute.operator === "is" ? equal : !equal;
    });
    return applyExistence(matched, condition.attribute.existence);
  }
  if ("preset" in condition) {
    const matched = environment.some((item) => {
      const equal = item.preset.id === condition.preset.presetId;
      return condition.preset.operator === "is" ? equal : !equal;
    });
    return applyExistence(matched, condition.preset.existence);
  }
  if ("selfVariantGroup" in condition) return false;

  const requirements = condition.concept.variants ?? [];
  const matched = environment.some((item) => {
    const sameConcept = item.concept.id === condition.concept.conceptId;
    if (condition.concept.operator === "is") return sameConcept;
    if (condition.concept.operator === "isNot") return !sameConcept;
    if (!sameConcept) return false;
    const variantsMatch = matchesVariantRequirements(item, requirements);
    return condition.concept.operator === "variantsMatch"
      ? variantsMatch
      : !variantsMatch;
  });
  return applyExistence(matched, condition.concept.existence);
}

export function evaluateFragments(
  fragments: PromptFragment[],
  set: PromptFragmentSet,
  self: RuntimeInstance,
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
    const definition = set.definitions.find(
      (candidate) => candidate.id === fragment.fragmentId,
    );
    if (!definition || resolving.has(definition.id)) continue;

    let selectedFragments: PromptFragment[] | undefined;
    if ("selfVariantGroup" in definition.if) {
      const condition = definition.if.selfVariantGroup;
      const selectedVariantId = self.instance.variantSelections.find(
        (selection) => selection.groupId === condition.groupId,
      )?.variantId;
      selectedFragments = condition.cases.find(
        (item) => item.variantId === selectedVariantId,
      )?.fragments;
      if (!selectedFragments) continue;
    } else {
      if (!evaluateCondition(definition.if, environment, data)) continue;
      selectedFragments = definition.fragments;
    }

    const nextResolving = new Set(resolving);
    nextResolving.add(definition.id);
    output.push(
      ...evaluateFragments(
        selectedFragments,
        set,
        self,
        environment,
        data,
        nextResolving,
      ),
    );
  }
  return output;
}

export function evaluateConceptInstance(
  self: RuntimeInstance,
  environment: RuntimeInstance[],
  data: Data,
  negative = false,
): string[] {
  const set = negative
    ? self.concept.negativePromptFragments
    : self.concept.promptFragments;
  return evaluateFragments(set.root, set, self, environment, data);
}

export function evaluatePrompt(generator: PromptGenerator, data: Data) {
  const environment = resolveInstances(generator, data);
  const positive: string[] = [];
  const negative: string[] = [];
  for (const item of environment) {
    positive.push(...evaluateConceptInstance(item, environment, data));
    negative.push(...evaluateConceptInstance(item, environment, data, true));
  }
  return {
    prompt: positive.join(","),
    negativePrompt: negative.join(","),
    environment,
  };
}

export function parseTags(input: string): string[] {
  return input
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}
