import { Data, Id } from "../data";

export interface PresetOption {
  id: Id;
  label: string;
  color?: string;
  backgroundColor?: string;
}

// Data is immutable; the tab owns one index for its current Data reference.
export function createDataIndex(data: Data) {
  const conceptById = new Map(data.concepts.map((item) => [item.id, item]));
  const categoryById = new Map(data.categories.map((item) => [item.id, item]));
  const attributeById = new Map(data.attributes.map((item) => [item.id, item]));
  const presetById = new Map<
    Id,
    {
      concept: Data["concepts"][number];
      preset: Data["concepts"][number]["presets"][number];
    }
  >();
  const presetOptions: PresetOption[] = [{ id: "__blank", label: "空白" }];
  for (const concept of data.concepts) {
    const category = categoryById.get(concept.categoryId);
    for (const preset of concept.presets) {
      if (!presetById.has(preset.id))
        presetById.set(preset.id, { concept, preset });
      presetOptions.push({
        id: preset.id,
        label: concept.variantGroups.length === 0 ? concept.name : preset.name,
        color: category?.color,
        backgroundColor: category?.backgroundColor,
      });
    }
  }
  return {
    conceptById,
    categoryById,
    attributeById,
    presetById,
    presetOptions,
  };
}
export type DataIndex = ReturnType<typeof createDataIndex>;
