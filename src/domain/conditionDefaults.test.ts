import { describe, expect, it } from "vitest";
import { Data } from "../data";
import { createInitialCondition } from "./conditionDefaults";
import { validateData } from "./validation";

const empty: Data = { schemaVersion: 2, attributes: [], categories: [], concepts: [] };

describe("named fragment starting conditions", () => {
  it("starts with a valid category condition when categories are available", () => {
    const data: Data = {
      ...empty,
      categories: [{ id: "category", name: "カテゴリ", attributeIds: [], backgroundColor: "", color: "" }],
      concepts: [{
        id: "concept", name: "コンセプト", categoryId: "category", attributeIds: [], variantGroups: [],
        presets: [{ id: "preset", name: "プリセット", variantSelections: [] }],
        promptFragments: { root: [], definitions: [] },
        negativePromptFragments: { root: [], definitions: [] },
      }],
    };
    const condition = createInitialCondition(data.concepts, data.categories, data.attributes)!;
    expect(condition).toEqual({ category: { categoryId: "category", operator: "is", existence: "exists" } });
    const concept = data.concepts[0];
    expect(validateData({ ...data, concepts: [{ ...concept, promptFragments: { root: [{ fragmentId: "f" }], definitions: [{ id: "f", name: "F", if: condition, fragments: [] }] } }] })).toEqual([]);
  });

  it("falls back to a concept or attribute and disables creation when there are no choices", () => {
    const concept = { id: "concept", name: "コンセプト", categoryId: "category", attributeIds: [], variantGroups: [], presets: [], promptFragments: { root: [], definitions: [] }, negativePromptFragments: { root: [], definitions: [] } };
    const attribute = { id: "attribute", name: "属性", implies: [] };
    expect(createInitialCondition([concept], [], [attribute])).toEqual({ concept: { conceptId: "concept", operator: "is", existence: "exists" } });
    expect(createInitialCondition([], [], [attribute])).toEqual({ attribute: { attributeId: "attribute", operator: "is", existence: "exists" } });
    expect(createInitialCondition([], [], [])).toBeUndefined();
  });
});
