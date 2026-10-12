import {
  Condition,
  Data,
  PromptFragmentSet,
  PromptGeneratorsData,
} from "../data";
import { allPresets } from "./presets";

export function validateData(
  input: Data,
  generatorInput?: PromptGeneratorsData,
): string[] {
  const errors: string[] = [];
  const data: any = input;
  if (data?.schemaVersion !== 2) errors.push("Unsupported schema version");
  for (const key of ["attributes", "categories", "concepts"])
    if (!Array.isArray(data?.[key])) errors.push(`${key} must be an array`);
  if (errors.length) return errors;

  const ids = new Set<string>();
  const addId = (value: any, path: string) => {
    if (typeof value?.id !== "string") {
      errors.push(`${path}: ID must be a string`);
      return;
    }
    if (ids.has(value.id)) errors.push(`${path}: duplicate id ${value.id}`);
    ids.add(value.id);
  };
  const attrs: any[] = data.attributes;
  const cats: any[] = data.categories;
  const concepts: any[] = data.concepts;
  attrs.forEach((value) => addId(value, "attribute"));
  cats.forEach((value) => addId(value, "category"));
  concepts.forEach((concept) => {
    addId(concept, "concept");
    for (const group of Array.isArray(concept?.variantGroups)
      ? concept.variantGroups
      : []) {
      addId(group, "variant group");
      for (const variant of Array.isArray(group?.variants)
        ? group.variants
        : [])
        addId(variant, "variant");
    }
    for (const preset of Array.isArray(concept?.presets) ? concept.presets : [])
      addId(preset, "preset");
    for (const setName of ["promptFragments", "negativePromptFragments"]) {
      const set = concept?.[setName];
      for (const definition of Array.isArray(set?.definitions)
        ? set.definitions
        : [])
        addId(definition, `${setName} definition`);
    }
  });

  const attrIds = new Set(attrs.map((value) => value?.id));
  const catIds = new Set(cats.map((value) => value?.id));
  const conceptIds = new Set(concepts.map((value) => value?.id));
  const presetIds = new Set(allPresets(input).map((entry) => entry.preset.id));
  const checkIds = (
    values: any,
    path: string,
    allowed: Set<any>,
    label: string,
  ) => {
    if (!Array.isArray(values)) {
      errors.push(`${path} must be an array`);
      return;
    }
    for (const id of values)
      if (!allowed.has(id))
        errors.push(`${path} has missing ${label} ${String(id)}`);
  };

  attrs.forEach((attribute) =>
    checkIds(
      attribute?.implies,
      `Attribute ${attribute?.id} implies`,
      attrIds,
      "attribute",
    ),
  );
  const visiting = new Set<any>();
  const visited = new Set<any>();
  const visitAttribute = (id: any) => {
    if (visiting.has(id)) {
      errors.push(`Attribute implication cycle at ${String(id)}`);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const next of attrs.find((attribute) => attribute?.id === id)
      ?.implies ?? [])
      visitAttribute(next);
    visiting.delete(id);
    visited.add(id);
  };
  attrs.forEach((attribute) => visitAttribute(attribute.id));
  cats.forEach((category) =>
    checkIds(
      category?.attributeIds,
      `Category ${category?.id} attributes`,
      attrIds,
      "attribute",
    ),
  );

  const groups = new Map<string, { group: any; concept: any }>();
  const variants = new Map<
    string,
    { variant: any; group: any; concept: any }
  >();
  for (const concept of concepts) {
    if (!catIds.has(concept?.categoryId))
      errors.push(
        `Concept ${concept?.id} has missing category ${String(concept?.categoryId)}`,
      );
    checkIds(
      concept?.attributeIds,
      `Concept ${concept?.id} attributes`,
      attrIds,
      "attribute",
    );
    if (
      !Array.isArray(concept?.variantGroups) ||
      !Array.isArray(concept?.presets)
    )
      errors.push(
        `Concept ${concept?.id}: variantGroups and presets must be arrays`,
      );
    for (const group of concept?.variantGroups ?? []) {
      groups.set(group.id, { group, concept });
      const count = group.variants?.length ?? 0;
      if (
        !Number.isInteger(group.minSelections) ||
        group.minSelections < 0 ||
        group.minSelections > count ||
        (group.maxSelections !== undefined &&
          (!Number.isInteger(group.maxSelections) ||
            group.maxSelections < group.minSelections))
      )
        errors.push(`VariantGroup ${group.id} has invalid selection limits`);
      for (const variant of group.variants ?? []) {
        variants.set(variant.id, { variant, group, concept });
        checkIds(
          variant.attributeIds,
          `Variant ${variant.id} attributes`,
          attrIds,
          "attribute",
        );
      }
    }
  }

  const checkCondition = (condition: any, owner: string): void => {
    if (
      !condition ||
      typeof condition !== "object" ||
      Array.isArray(condition) ||
      Object.keys(condition).length !== 1
    ) {
      errors.push(`${owner}: invalid Condition`);
      return;
    }
    if ("all" in condition || "any" in condition) {
      const key = "all" in condition ? "all" : "any";
      if (!Array.isArray(condition[key])) {
        errors.push(`${owner}: ${key} must be an array`);
        return;
      }
      if (!condition[key].length)
        errors.push(`${owner}: empty logical condition`);
      condition[key].forEach((child: any) => checkCondition(child, owner));
      return;
    }
    if ("category" in condition) {
      const item = condition.category;
      if (!item || !catIds.has(item.categoryId))
        errors.push(`${owner}: missing category ${String(item?.categoryId)}`);
      if (!item || !["is", "isNot"].includes(item.operator))
        errors.push(`${owner}: invalid category operator`);
      return;
    }
    if ("attribute" in condition) {
      const item = condition.attribute;
      if (!item || !attrIds.has(item.attributeId))
        errors.push(`${owner}: missing attribute ${String(item?.attributeId)}`);
      if (!item || !["is", "isNot"].includes(item.operator))
        errors.push(`${owner}: invalid attribute operator`);
      return;
    }
    if ("preset" in condition) {
      const item = condition.preset;
      if (!item || !presetIds.has(item.presetId))
        errors.push(`${owner}: missing preset ${String(item?.presetId)}`);
      if (!item || !["is", "isNot"].includes(item.operator))
        errors.push(`${owner}: invalid preset operator`);
      return;
    }
    if ("concept" in condition) {
      const item = condition.concept;
      if (!item || !conceptIds.has(item.conceptId))
        errors.push(`${owner}: missing concept ${String(item?.conceptId)}`);
      const allowed = ["is", "isNot", "variantsMatch", "variantsDoNotMatch"];
      if (!item || !allowed.includes(item.operator)) {
        errors.push(`${owner}: invalid concept operator`);
        return;
      }
      const usesVariants =
        item.operator === "variantsMatch" ||
        item.operator === "variantsDoNotMatch";
      if (!usesVariants) {
        if (
          item.variants !== undefined &&
          (!Array.isArray(item.variants) || item.variants.length)
        )
          errors.push(
            `${owner}: variants are only valid for variant concept conditions`,
          );
        return;
      }
      if (!Array.isArray(item.variants) || !item.variants.length) {
        errors.push(
          `${owner}: variant concept condition requires at least one variant`,
        );
        return;
      }
      for (const requirement of item.variants) {
        const groupEntry = groups.get(requirement.groupId);
        const variantEntry = variants.get(requirement.variantId);
        if (
          !groupEntry ||
          !variantEntry ||
          groupEntry.concept.id !== item.conceptId ||
          variantEntry.group.id !== requirement.groupId
        )
          errors.push(`${owner}: missing or foreign variant reference`);
      }
      return;
    }
    errors.push(`${owner}: unknown Condition operator`);
  };

  const checkFragmentSet = (set: any, owner: string): void => {
    if (
      !set ||
      typeof set !== "object" ||
      !Array.isArray(set.root) ||
      !Array.isArray(set.definitions)
    ) {
      errors.push(`${owner}: invalid fragment set`);
      return;
    }
    const definitionIds = new Set(
      set.definitions.map((definition: any) => definition?.id),
    );
    const names = new Set<string>();
    const checkSequence = (fragments: any, path: string) => {
      if (!Array.isArray(fragments)) {
        errors.push(`${path}: fragments must be an array`);
        return;
      }
      for (const fragment of fragments) {
        if (typeof fragment === "string") {
          if (!fragment.trim()) errors.push(`${path}: whitespace-only tag`);
          continue;
        }
        if (
          !fragment ||
          typeof fragment !== "object" ||
          Array.isArray(fragment) ||
          Object.keys(fragment).length !== 1 ||
          typeof fragment.fragmentId !== "string"
        ) {
          errors.push(`${path}: invalid fragment reference`);
          continue;
        }
        if (!definitionIds.has(fragment.fragmentId))
          errors.push(`${path}: missing named fragment ${fragment.fragmentId}`);
      }
    };
    checkSequence(set.root, `${owner} root`);
    for (const definition of set.definitions) {
      if (typeof definition.name !== "string" || !definition.name.trim())
        errors.push(`${owner}: named fragment must have a name`);
      else if (names.has(definition.name))
        errors.push(
          `${owner}: duplicate named fragment name ${definition.name}`,
        );
      else names.add(definition.name);
      checkCondition(
        definition.if,
        `${owner} #[${definition.name ?? definition.id}]`,
      );
      checkSequence(
        definition.fragments,
        `${owner} #[${definition.name ?? definition.id}]`,
      );
    }
    const byId = new Map(
      set.definitions.map((definition: any) => [definition.id, definition]),
    );
    const cycleVisiting = new Set<string>();
    const cycleDone = new Set<string>();
    const visit = (id: string): boolean => {
      if (cycleVisiting.has(id)) return true;
      if (cycleDone.has(id)) return false;
      cycleVisiting.add(id);
      const definition: any = byId.get(id);
      for (const fragment of definition?.fragments ?? [])
        if (typeof fragment !== "string" && visit(fragment.fragmentId))
          return true;
      cycleVisiting.delete(id);
      cycleDone.add(id);
      return false;
    };
    for (const id of byId.keys())
      if (visit(id as string)) {
        errors.push(`${owner}: named fragment reference cycle`);
        break;
      }
  };

  for (const concept of concepts) {
    checkFragmentSet(
      concept.promptFragments,
      `Concept ${concept.id} promptFragments`,
    );
    checkFragmentSet(
      concept.negativePromptFragments,
      `Concept ${concept.id} negativePromptFragments`,
    );
    for (const preset of concept.presets ?? []) {
      if (!Array.isArray(preset.variantSelections)) {
        errors.push(`Preset ${preset.id}: variantSelections must be an array`);
        continue;
      }
      const used = new Set<string>();
      for (const selection of preset.variantSelections) {
        if (used.has(selection.groupId))
          errors.push(`Preset ${preset.id} repeats group ${selection.groupId}`);
        used.add(selection.groupId);
        const group = (concept.variantGroups ?? []).find(
          (candidate: any) => candidate.id === selection.groupId,
        );
        if (!group) {
          errors.push(
            `Preset ${preset.id} has missing group ${selection.groupId}`,
          );
          continue;
        }
        if (!Array.isArray(selection.variantIds)) {
          errors.push(`Preset ${preset.id}: variantIds must be an array`);
          continue;
        }
        if (new Set(selection.variantIds).size !== selection.variantIds.length)
          errors.push(`Preset ${preset.id} has duplicate variant`);
        for (const id of selection.variantIds)
          if (!group.variants.some((variant: any) => variant.id === id))
            errors.push(`Preset ${preset.id} has invalid variant ${id}`);
        if (
          selection.variantIds.length < group.minSelections ||
          (group.maxSelections !== undefined &&
            selection.variantIds.length > group.maxSelections)
        )
          errors.push(
            `Preset ${preset.id} violates group ${group.id} selection limits`,
          );
      }
      for (const group of concept.variantGroups ?? [])
        if (group.minSelections > 0 && !used.has(group.id))
          errors.push(
            `Preset ${preset.id} missing required selection for ${group.id}`,
          );
    }
  }

  if (generatorInput !== undefined) {
    const generators: any = generatorInput;
    if (generators?.schemaVersion !== 2)
      errors.push("Unsupported prompt generator schema version");
    if (!Array.isArray(generators?.promptGenerators))
      errors.push("promptGenerators must be an array");
    for (const generator of generators.promptGenerators ?? []) {
      addId(generator, "prompt generator");
      if (!Array.isArray(generator.presetSlots)) {
        errors.push(
          `PromptGenerator ${generator.id}: presetSlots must be an array`,
        );
        continue;
      }
      for (const slot of generator.presetSlots) {
        addId(slot, "preset slot");
        if (slot.presetId !== undefined && !presetIds.has(slot.presetId))
          errors.push(
            `PromptGenerator ${generator.id} references missing preset ${String(slot.presetId)}`,
          );
      }
    }
  }
  return [...new Set(errors)];
}
