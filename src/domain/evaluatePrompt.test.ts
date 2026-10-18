import { createDataIndex } from "./dataIndex";
import { describe, expect, it, vi } from "vitest";
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
          variants: [
            { id: "v", name: "one", attributeIds: ["life"] },
            { id: "v2", name: "two", attributeIds: [] },
          ],
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
  instances: ids.map((presetId, index) => {
    for (const concept of d.concepts) {
      const found = concept.presets.find((item) => item.id === presetId);
      if (found) {
        return {
          id: `instance-${index}`,
          conceptId: concept.id,
          presetId,
          variantSelections: found.variantSelections.map((selection) => ({
            ...selection,
          })),
        };
      }
    }
    throw new Error(`missing preset ${presetId}`);
  }),
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

  it("creates distinct runtime instances per repeated preset and retains order", () => {
    const out = evaluatePrompt(gen(["pa", "pb", "pa"]), d);
    expect(out.environment.map((item) => item.instance.id)).toEqual([
      "instance-0",
      "instance-1",
      "instance-2",
    ]);
    expect(out.prompt).toBe("same,same,same,same");
  });

  it("uses independently edited instance variants instead of preset defaults", () => {
    const generator = gen(["pb"]);
    generator.instances[0].variantSelections = [
      { groupId: "g", variantId: "v2" },
    ];
    const out = evaluatePrompt(generator, d);
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
    ).toBe(false);
    expect(
      evaluateCondition(
        {
          concept: {
            conceptId: "b",
            operator: "variantsMatch",
            variants: [{ groupId: "g", variantId: "v2" }],
            existence: "exists",
          },
        },
        out.environment,
        d,
      ),
    ).toBe(true);
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
          category: {
            categoryId: "char",
            operator: "is",
            existence: "exists",
          },
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
              concept: {
                conceptId: "a",
                operator: "is",
                existence: "exists",
              },
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
              concept: {
                conceptId: "x",
                operator: "is",
                existence: "exists",
              },
            },
            {
              concept: {
                conceptId: "a",
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

// Fixed expected strings cover both channels and edited variants through the same conditions.
it("preserves conditional positive/negative fragments and self variant cases", () => {
  const x: Data = {
    ...d,
    concepts: d.concepts.map((concept) =>
      concept.id !== "b"
        ? concept
        : {
            ...concept,
            promptFragments: {
              root: [
                "base",
                { fragmentId: "conditions" },
                { fragmentId: "variant" },
              ],
              definitions: [
                {
                  id: "conditions",
                  name: "conditions",
                  if: {
                    all: [
                      {
                        attribute: {
                          attributeId: "life",
                          operator: "is",
                          existence: "exists",
                        },
                      },
                      {
                        category: {
                          categoryId: "char",
                          operator: "is",
                          existence: "exists",
                        },
                      },
                      {
                        preset: {
                          presetId: "pa",
                          operator: "is",
                          existence: "exists",
                        },
                      },
                      {
                        concept: {
                          conceptId: "a",
                          operator: "is",
                          existence: "exists",
                        },
                      },
                    ],
                  },
                  fragments: ["matched"],
                },
                {
                  id: "variant",
                  name: "variant",
                  if: {
                    selfVariantGroup: {
                      groupId: "g",
                      cases: [
                        { variantId: "v", fragments: ["one"] },
                        { variantId: "v2", fragments: ["two"] },
                      ],
                    },
                  },
                  fragments: [],
                },
              ],
            },
            negativePromptFragments: {
              root: [{ fragmentId: "negative" }],
              definitions: [
                {
                  id: "negative",
                  name: "negative",
                  if: {
                    attribute: {
                      attributeId: "life",
                      operator: "is",
                      existence: "exists",
                    },
                  },
                  fragments: ["conditional negative"],
                },
              ],
            },
          },
    ),
  };
  const generator = gen(["pa", "pb"]);
  const index = createDataIndex(x);
  const lookup = vi.spyOn(index.attributeById, "get");
  expect(evaluatePrompt(generator, x, index)).toMatchObject({
    prompt: "same,same,base,matched,one",
    negativePrompt: "neg,conditional negative",
  });
  // The same first instance satisfies both attribute conditions; its implied closure is built once.
  expect(lookup).toHaveBeenCalledTimes(3);
  const edited = {
    ...generator,
    instances: generator.instances.map((instance) =>
      instance.conceptId !== "b"
        ? instance
        : {
            ...instance,
            variantSelections: [{ groupId: "g", variantId: "v2" }],
          },
    ),
  };
  expect(evaluatePrompt(edited, x, index)).toMatchObject({
    prompt: "same,same,base,matched,two",
    negativePrompt: "neg,conditional negative",
  });
  expect(evaluatePrompt(gen(["pb"]), x, index)).toMatchObject({
    prompt: "base,one",
    negativePrompt: "conditional negative",
  });
});
