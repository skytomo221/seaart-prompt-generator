import { expect, it } from "vitest";
import { Data } from "../data";
import { createDataIndex } from "./dataIndex";

it("indexes original objects and builds one ordered shared preset list", () => {
  const data: Data = {
    schemaVersion: 2,
    attributes: [{ id: "attribute", name: "attribute", implies: [] }],
    categories: [
      {
        id: "category",
        name: "category",
        attributeIds: [],
        color: "red",
        backgroundColor: "blue",
      },
    ],
    concepts: [
      {
        id: "concept",
        name: "concept label",
        categoryId: "category",
        attributeIds: [],
        variantGroups: [],
        presets: [
          { id: "preset", name: "preset label", variantSelections: [] },
        ],
        promptFragments: { root: [], definitions: [] },
        negativePromptFragments: { root: [], definitions: [] },
      },
    ],
  };
  const index = createDataIndex(data);
  expect(index.conceptById.get("concept")).toBe(data.concepts[0]);
  expect(index.categoryById.get("category")).toBe(data.categories[0]);
  expect(index.attributeById.get("attribute")).toBe(data.attributes[0]);
  expect(index.presetById.get("preset")).toEqual({
    concept: data.concepts[0],
    preset: data.concepts[0].presets[0],
  });
  for (const map of [
    index.conceptById,
    index.categoryById,
    index.attributeById,
    index.presetById,
  ])
    expect(map.get("missing")).toBeUndefined();
  expect(index.presetOptions).toEqual([
    { id: "__blank", label: "空白" },
    {
      id: "preset",
      label: "concept label",
      color: "red",
      backgroundColor: "blue",
    },
  ]);
  const changed = {
    ...data,
    concepts: data.concepts.map((concept) => ({
      ...concept,
      variantGroups: [{ id: "group", name: "group", variants: [] }],
    })),
  };
  expect(createDataIndex(changed).presetOptions[1].label).toBe("preset label");
  expect(index.presetOptions[1].label).toBe("concept label");
});
