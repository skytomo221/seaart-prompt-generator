import { describe, expect, it } from "vitest";
import { Data, PromptGeneratorsData } from "../data";
import { validateData } from "./validation";

const base: Data = {
  schemaVersion: 2,
  attributes: [],
  categories: [
    { id: "cat", name: "c", attributeIds: [], backgroundColor: "", color: "" },
  ],
  concepts: [
    {
      id: "con",
      name: "x",
      categoryId: "cat",
      attributeIds: [],
      variantGroups: [],
      presets: [{ id: "pre", name: "p", variantSelections: [] }],
      promptFragments: { root: [], definitions: [] },
      negativePromptFragments: { root: [], definitions: [] },
    },
  ],
};

describe("V2 named fragment validation", () => {
  it("rejects attribute cycles and dangling references", () => {
    const x = {
      ...base,
      attributes: [
        { id: "a", name: "a", implies: ["b"] },
        { id: "b", name: "b", implies: ["a"] },
      ],
    };
    expect(validateData(x).some((error) => error.includes("cycle"))).toBe(true);
    expect(
      validateData({
        ...base,
        concepts: [{ ...base.concepts[0], categoryId: "missing" }],
      }).some((error) => error.includes("missing category")),
    ).toBe(true);
  });

  it("validates globally unique nested preset ids and generator refs", () => {
    const pg: PromptGeneratorsData = {
      schemaVersion: 2,
      promptGenerators: [
        { id: "pg", presetSlots: [{ id: "s", presetId: "unknown" }] },
      ],
    };
    expect(
      validateData(base, pg).some((error) => error.includes("missing preset")),
    ).toBe(true);
    expect(
      validateData({
        ...base,
        concepts: [...base.concepts, { ...base.concepts[0], id: "other" }],
      }).some((error) => error.includes("duplicate id pre")),
    ).toBe(true);
  });

  it("rejects named-fragment cycles, duplicate names and dangling refs", () => {
    const concept = {
      ...base.concepts[0],
      promptFragments: {
        root: [{ fragmentId: "a" }],
        definitions: [
          {
            id: "a",
            name: "同名",
            if: {
              category: {
                categoryId: "cat",
                operator: "is" as const,
                existence: "exists" as const,
              },
            },
            fragments: [{ fragmentId: "b" }],
          },
          {
            id: "b",
            name: "同名",
            if: {
              category: {
                categoryId: "cat",
                operator: "is" as const,
                existence: "exists" as const,
              },
            },
            fragments: [{ fragmentId: "a" }],
          },
        ],
      },
    };
    const errors = validateData({ ...base, concepts: [concept] });
    expect(
      errors.some((error) => error.includes("duplicate named fragment name")),
    ).toBe(true);
    expect(errors.some((error) => error.includes("reference cycle"))).toBe(
      true,
    );
  });

  it("rejects bad logical and concept-variant conditions", () => {
    const concept = {
      ...base.concepts[0],
      promptFragments: {
        root: [{ fragmentId: "f" }],
        definitions: [
          { id: "f", name: "条件", if: { all: [] }, fragments: ["tag"] },
        ],
      },
    };
    expect(
      validateData({ ...base, concepts: [concept] }).some((error) =>
        error.includes("empty logical"),
      ),
    ).toBe(true);
    const concept2 = {
      ...base.concepts[0],
      promptFragments: {
        root: [{ fragmentId: "f2" }],
        definitions: [
          {
            id: "f2",
            name: "条件2",
            if: {
              concept: {
                conceptId: "con",
                operator: "variantsMatch" as const,
                variants: [],
                existence: "exists" as const,
              },
            },
            fragments: ["tag"],
          },
        ],
      },
    };
    expect(
      validateData({ ...base, concepts: [concept2] }).some((error) =>
        error.includes("requires at least one variant"),
      ),
    ).toBe(true);
  });

  it("validates VariantGroup limits and selections", () => {
    const concept = {
      ...base.concepts[0],
      variantGroups: [
        {
          id: "g",
          name: "g",
          minSelections: 1,
          maxSelections: 1,
          variants: [{ id: "v", name: "v", attributeIds: [] }],
        },
      ],
    };
    const data = {
      ...base,
      concepts: [
        {
          ...concept,
          presets: [
            {
              id: "pre",
              name: "p",
              variantSelections: [{ groupId: "g", variantIds: ["v", "v"] }],
            },
          ],
        },
      ],
    };
    expect(
      validateData(data).some((error) => error.includes("duplicate variant")),
    ).toBe(true);
    expect(
      validateData({
        ...base,
        concepts: [
          {
            ...concept,
            presets: [{ id: "pre", name: "p", variantSelections: [] }],
          },
        ],
      }).some((error) => error.includes("missing required selection")),
    ).toBe(true);
  });
});
