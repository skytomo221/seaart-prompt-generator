import {
  Condition,
  Data,
  PromptFragmentSet,
  PromptGeneratorsData,
} from "../data";

type Kind =
  "concept" | "category" | "attribute" | "preset" | "variantGroup" | "variant";

function conditionHas(
  condition: Condition,
  field: string,
  id: string,
): boolean {
  if ("all" in condition)
    return condition.all.some((child) => conditionHas(child, field, id));
  if ("any" in condition)
    return condition.any.some((child) => conditionHas(child, field, id));
  if ("category" in condition)
    return field === "categoryId" && condition.category.categoryId === id;
  if ("attribute" in condition)
    return field === "attributeId" && condition.attribute.attributeId === id;
  if ("preset" in condition)
    return field === "presetId" && condition.preset.presetId === id;
  if (field === "conceptId" && condition.concept.conceptId === id) return true;
  if (
    field === "groupId" &&
    condition.concept.variants?.some(
      (requirement) => requirement.groupId === id,
    )
  )
    return true;
  if (
    field === "variantId" &&
    condition.concept.variants?.some(
      (requirement) => requirement.variantId === id,
    )
  )
    return true;
  return false;
}

function setHas(set: PromptFragmentSet, field: string, id: string): boolean {
  return set.definitions.some((definition) =>
    conditionHas(definition.if, field, id),
  );
}

function dataHasCondition(data: Data, field: string, id: string): boolean {
  return data.concepts.some(
    (concept) =>
      setHas(concept.promptFragments, field, id) ||
      setHas(concept.negativePromptFragments, field, id),
  );
}

export function getDeletionReferences(
  kind: Kind,
  id: string,
  data: Data,
  generators: PromptGeneratorsData,
  concept?: Data["concepts"][number],
): string[] {
  const refs: string[] = [];
  if (kind === "concept") {
    for (const preset of concept?.presets ?? []) {
      if (
        generators.promptGenerators.some((generator) =>
          generator.presetSlots.some((slot) => slot.presetId === preset.id),
        )
      )
        refs.push(`プリセット「${preset.name}」（プロンプト生成フォーム）`);
    }
    if (dataHasCondition(data, "conceptId", id))
      refs.push("名前付きフラグメントのコンセプト条件");
    for (const group of concept?.variantGroups ?? []) {
      if (dataHasCondition(data, "groupId", group.id))
        refs.push(
          `名前付きフラグメントのバリアントグループ条件「${group.name}」`,
        );
      for (const variant of group.variants)
        if (dataHasCondition(data, "variantId", variant.id))
          refs.push(`名前付きフラグメントのバリアント条件「${variant.name}」`);
    }
  }
  if (kind === "preset") {
    if (
      generators.promptGenerators.some((generator) =>
        generator.presetSlots.some((slot) => slot.presetId === id),
      )
    )
      refs.push("プロンプト生成フォームで使用中");
    if (dataHasCondition(data, "presetId", id))
      refs.push("名前付きフラグメントのプリセット条件");
  }
  if (kind === "variantGroup") {
    for (const owner of data.concepts)
      for (const preset of owner.presets)
        if (
          preset.variantSelections.some((selection) => selection.groupId === id)
        )
          refs.push(`プリセット「${preset.name}」`);
    if (dataHasCondition(data, "groupId", id))
      refs.push("名前付きフラグメントのバリアントグループ条件");
  }
  if (kind === "variant") {
    for (const owner of data.concepts)
      for (const preset of owner.presets)
        if (
          preset.variantSelections.some((selection) =>
            selection.variantIds.includes(id),
          )
        )
          refs.push(`プリセット「${preset.name}」`);
    if (dataHasCondition(data, "variantId", id))
      refs.push("名前付きフラグメントのバリアント条件");
  }
  if (kind === "category") {
    data.concepts
      .filter((item) => item.categoryId === id)
      .forEach((item) => refs.push(`コンセプト「${item.name}」`));
    if (dataHasCondition(data, "categoryId", id))
      refs.push("名前付きフラグメントのカテゴリ条件");
  }
  if (kind === "attribute") {
    data.attributes
      .filter((attribute) => attribute.implies.includes(id))
      .forEach((attribute) => refs.push(`含意する属性「${attribute.name}」`));
    data.categories
      .filter((category) => category.attributeIds.includes(id))
      .forEach((category) => refs.push(`カテゴリ「${category.name}」`));
    data.concepts.forEach((item) => {
      if (item.attributeIds.includes(id))
        refs.push(`コンセプト「${item.name}」`);
      if (
        item.variantGroups.some((group) =>
          group.variants.some((variant) => variant.attributeIds.includes(id)),
        )
      )
        refs.push(`バリアントの属性（${item.name}）`);
    });
    if (dataHasCondition(data, "attributeId", id))
      refs.push("名前付きフラグメントの属性条件");
  }
  return [...new Set(refs)];
}
