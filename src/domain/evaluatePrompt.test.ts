import { describe, expect, it } from "vitest";
import { Data, PromptGenerator } from "../data";
import {
  evaluateCondition,
  evaluatePrompt,
  getEffectiveAttributes,
  parseTags,
} from "./evaluatePrompt";

const preset = (id: string, variantSelections: any[] = []) => ({
  id,
  name: id,
  variantSelections,
});
const emptySet = () => ({ root: [], definitions: [] });
const d: Data = {
  schemaVersion: 2,
  attributes: [
    { id: "life", name: "生物", implies: [] },
    { id: "human", name: "人間", implies: ["life"] },
    { id: "student", name: "学生", implies: ["human"] },
  ],
  categories: [
    {
      id: "char",
      name: "キャラ",
      attributeIds: [],
      backgroundColor: "",
      color: "",
    },
    {
      id: "clothes",
      name: "衣装",
      attributeIds: [],
      backgroundColor: "",
      color: "",
    },
    {
      id: "front",
      name: "正面",
      attributeIds: [],
      backgroundColor: "",
      color: "",
    },
  ],
  concepts: [
    {
      id: "a",
      name: "A",
      categoryId: "char",
      attributeIds: ["student"],
      variantGroups: [],
      presets: [preset("pa")],
      promptFragments: { root: ["same", "same"], definitions: [] },
      negativePromptFragments: { root: ["neg"], definitions: [] },
    },
    {
      id: "b",
      name: "B",
      categoryId: "clothes",
      attributeIds: [],
      variantGroups: [
        {
          id: "g",
          name: "style",
          variants: [{ id: "v", name: "one", attributeIds: ["life"] }],
        },
      ],
      presets: [preset("pb", [{ groupId: "g", variantId: "v" }])],
      promptFragments: emptySet(),
      negativePromptFragments: emptySet(),
    },
    {
      id: "face",
      name: "正面",
      categoryId: "front",
      attributeIds: [],
      variantGroups: [],
      presets: [preset("pf")],
      promptFragments: emptySet(),
      negativePromptFragments: emptySet(),
    },
  ],
};
const gen = (ids: string[]): PromptGenerator => ({
  id: "pg",
  presetSlots: ids.map((id, index) => ({ id: `slot-${index}`, presetId: id })),
});

describe("V2 named fragment evaluator", () => {
  it("keeps tag order and duplicates", () =>
    expect(evaluatePrompt(gen(["pa"]), d).prompt).toBe("same,same"));

  it("evaluates named fragments in place", () => {
    const x: Data = {
      ...d,
      concepts: d.concepts.map((concept) =>
        concept.id === "a"
          ? {
              ...concept,
              promptFragments: {
                root: ["lolita", { fragmentId: "default" }, "frilled dress"],
                definitions: [
                  {
                    id: "default",
                    name: "デフォルト服",
                    if: {
                      category: {
                        categoryId: "front",
                        operator: "is",
                        existence: "notExists",
                      },
                    },
                    fragments: ["ribbon"],
                  },
                ],
              },
            }
          : concept,
      ),
    };
    expect(evaluatePrompt(gen(["pa"]), x).prompt).toBe(
      "lolita,ribbon,frilled dress",
    );
    expect(evaluatePrompt(gen(["pa", "pf"]), x).prompt).toBe(
      "lolita,frilled dress",
    );
  });

  it("supports nested named fragments", () => {
    const x: Data = {
      ...d,
      concepts: d.concepts.map((concept) =>
        concept.id === "a"
          ? {
              ...concept,
              promptFragments: {
                root: [{ fragmentId: "outer" }],
                definitions: [
                  {
                    id: "outer",
                    name: "外側",
                    if: {
                      category: {
                        categoryId: "char",
                        operator: "is",
                        existence: "exists",
                      },
                    },
                    fragments: [{ fragmentId: "inner" }],
                  },
                  {
                    id: "inner",
                    name: "内側",
                    if: {
                      preset: {
                        presetId: "pa",
                        operator: "is",
                        existence: "exists",
                      },
                    },
                    fragments: ["nested"],
                  },
                ],
              },
            }
          : concept,
      ),
    };
    expect(evaluatePrompt(gen(["pa"]), x).prompt).toBe("nested");
  });

  it("creates distinct runtime instances per repeated slot and retains slot order", () => {
    const out = evaluatePrompt(gen(["pa", "pb", "pa"]), d);
    expect(out.environment.map((item) => item.instance.id)).toEqual([
      "slot-0",
      "slot-1",
      "slot-2",
    ]);
    expect(out.prompt).toBe("same,same,same,same");
  });

  it("separates per-instance comparison from existence", () => {
    const mixed = evaluatePrompt(gen(["pa", "pb"]), d).environment;
    expect(
      evaluateCondition(
        {
          category: {
            categoryId: "clothes",
            operator: "is",
            existence: "exists",
          },
        },
        mixed,
        d,
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        {
          category: {
            categoryId: "clothes",
            operator: "is",
            existence: "notExists",
          },
        },
        mixed,
        d,
      ),
    ).toBe(false);
    expect(
      evaluateCondition(
        {
          category: {
            categoryId: "clothes",
            operator: "isNot",
            existence: "exists",
          },
        },
        mixed,
        d,
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        {
          category: {
            categoryId: "clothes",
            operator: "isNot",
            existence: "notExists",
          },
        },
        mixed,
        d,
      ),
    ).toBe(false);
    const onlyClothes = evaluatePrompt(gen(["pb"]), d).environment;
    expect(
      evaluateCondition(
        {
          category: {
            categoryId: "clothes",
            operator: "isNot",
            existence: "notExists",
          },
        },
        onlyClothes,
        d,
      ),
    ).toBe(true);
  });

  it("evaluates concept and variant conditions", () => {
    const out = evaluatePrompt(gen(["pb"]), d);
    expect(
      evaluateCondition(
        { concept: { conceptId: "b", operator: "is", existence: "exists" } },
        out.environment,
        d,
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        {
          concept: {
            conceptId: "b",
            operator: "variantsMatch",
            variants: [{ groupId: "g", variantId: "v" }],
            existence: "exists",
          },
        },
        out.environment,
        d,
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        {
          concept: {
            conceptId: "b",
            operator: "variantsMatch",
            variants: [{ groupId: "g", variantId: "v" }],
            existence: "notExists",
          },
        },
        out.environment,
        d,
      ),
    ).toBe(false);
  });

  it("evaluates category, preset and implied attributes", () => {
    const x: Data = {
      ...d,
      categories: d.categories.map((category) =>
        category.id === "char"
          ? { ...category, attributeIds: ["life"] }
          : category,
      ),
    };
    const out = evaluatePrompt(gen(["pa", "pb"]), x);
    expect(
      evaluateCondition(
        {
          category: { categoryId: "char", operator: "is", existence: "exists" },
        },
        out.environment,
        x,
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        { preset: { presetId: "pa", operator: "is", existence: "exists" } },
        out.environment,
        x,
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        {
          attribute: {
            attributeId: "life",
            operator: "is",
            existence: "exists",
          },
        },
        out.environment,
        x,
      ),
    ).toBe(true);
    expect([...getEffectiveAttributes(out.environment[0], x)]).toEqual([
      "life",
      "student",
      "human",
    ]);
  });

  it("supports all and any", () => {
    const out = evaluatePrompt(gen(["pa"]), d);
    expect(
      evaluateCondition(
        {
          all: [
            {
              concept: { conceptId: "a", operator: "is", existence: "exists" },
            },
            {
              attribute: {
                attributeId: "life",
                operator: "is",
                existence: "exists",
              },
            },
          ],
        },
        out.environment,
        d,
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        {
          any: [
            {
              concept: { conceptId: "x", operator: "is", existence: "exists" },
            },
            {
              concept: { conceptId: "a", operator: "is", existence: "exists" },
            },
          ],
        },
        out.environment,
        d,
      ),
    ).toBe(true);
  });

  it("keeps positive and negative outputs independent", () => {
    const output = evaluatePrompt(gen(["pa"]), d);
    expect(output.prompt).toBe("same,same");
    expect(output.negativePrompt).toBe("neg");
  });

  it("parses bulk tags without deduplication", () =>
    expect(parseTags("lolita, ribbon, , ribbon ")).toEqual([
      "lolita",
      "ribbon",
      "ribbon",
    ]));
});
