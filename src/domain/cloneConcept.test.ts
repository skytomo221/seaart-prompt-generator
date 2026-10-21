import { expect, it } from "vitest";
import type { Concept, Condition } from "../data";
import { cloneConcept } from "./cloneConcept";

function fixture(): Concept {
  return {
    id: "c",
    name: "original",
    categoryId: "category",
    attributeIds: ["attribute"],
    variantGroups: [
      {
        id: "g",
        name: "group",
        variants: [{ id: "v", name: "variant", attributeIds: ["attribute"] }],
      },
    ],
    presets: [
      {
        id: "p",
        name: "preset",
        variantSelections: [{ groupId: "g", variantId: "v" }],
      },
    ],
    promptFragments: {
      root: [
        { fragmentId: "f" },
        {
          parts: [
            "text",
            { fragmentId: "n" },
            { fragmentId: "external-fragment" },
          ],
        },
      ],
      definitions: [
        {
          id: "f",
          name: "fragment",
          if: {
            all: [
              {
                selfVariantGroup: {
                  groupId: "g",
                  cases: [
                    {
                      variantId: "v",
                      fragments: [
                        { fragmentId: "f" },
                        { parts: [{ fragmentId: "n" }] },
                      ],
                    },
                  ],
                },
              },
              {
                any: [
                  {
                    concept: {
                      conceptId: "c",
                      operator: "variantsMatch",
                      existence: "exists",
                      variants: [{ groupId: "g", variantId: "v" }],
                    },
                  },
                  {
                    preset: {
                      presetId: "p",
                      operator: "is",
                      existence: "exists",
                    },
                  },
                ],
              },
              {
                concept: {
                  conceptId: "external",
                  operator: "variantsMatch",
                  existence: "exists",
                  variants: [
                    { groupId: "external-g", variantId: "external-v" },
                  ],
                },
              },
              {
                preset: {
                  presetId: "external-p",
                  operator: "is",
                  existence: "exists",
                },
              },
              {
                category: {
                  categoryId: "category",
                  operator: "is",
                  existence: "exists",
                },
              },
              {
                attribute: {
                  attributeId: "attribute",
                  operator: "is",
                  existence: "exists",
                },
              },
            ],
          },
          fragments: [{ fragmentId: "n" }],
        },
      ],
    },
    negativePromptFragments: {
      root: [{ fragmentId: "n" }],
      definitions: [
        {
          id: "n",
          name: "negative",
          if: { any: [] },
          fragments: [{ fragmentId: "f" }],
        },
      ],
    },
  };
}

it("assigns unique UUIDs to every owned entity and preserves names", () => {
  const source = fixture(),
    copy = cloneConcept(source);
  const ids = (c: Concept) => [
    c.id,
    ...c.variantGroups.flatMap((g) => [g.id, ...g.variants.map((v) => v.id)]),
    ...c.presets.map((p) => p.id),
    ...[c.promptFragments, c.negativePromptFragments].flatMap((s) =>
      s.definitions.map((d) => d.id),
    ),
  ];
  expect(new Set([...ids(source), ...ids(copy)]).size).toBe(12);
  ids(copy).forEach((id) =>
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    ),
  );
  expect(copy.name).toBe(source.name);
  expect(cloneConcept(source).id).not.toBe(copy.id);
});

it("rewires presets, nested conditions and fragment references in both sets", () => {
  const source = fixture(),
    copy = cloneConcept(source);
  const mapping = new Map([
    ["c", copy.id],
    ["g", copy.variantGroups[0].id],
    ["v", copy.variantGroups[0].variants[0].id],
    ["p", copy.presets[0].id],
    ["f", copy.promptFragments.definitions[0].id],
    ["n", copy.negativePromptFragments.definitions[0].id],
  ]);
  // This fixture uses distinct strings for entity IDs, external IDs and names.
  const expected = JSON.parse(JSON.stringify(source), (_key, value) =>
    typeof value === "string" ? (mapping.get(value) ?? value) : value,
  );
  expect(copy).toEqual(expected);
  expect(copy.presets[0].variantSelections).toEqual([
    {
      groupId: copy.variantGroups[0].id,
      variantId: copy.variantGroups[0].variants[0].id,
    },
  ]);
});

it("preserves external references and keeps all nested objects independent", () => {
  const source = fixture(),
    before = structuredClone(source),
    copy = cloneConcept(source);
  expect(copy.categoryId).toBe("category");
  expect(copy.attributeIds).toEqual(["attribute"]);
  expect(copy.variantGroups[0].variants[0].attributeIds).toEqual(["attribute"]);
  const conditions = (
    copy.promptFragments.definitions[0].if as { all: Condition[] }
  ).all;
  expect(conditions.slice(2)).toEqual(
    (
      source.promptFragments.definitions[0].if as { all: Condition[] }
    ).all.slice(2),
  );
  const mutate = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (typeof child === "string")
        (value as Record<string, unknown>)[key] = "edited";
      else mutate(child);
    }
    if (Array.isArray(value)) value.push("edited");
  };
  mutate(copy);
  expect(source).toEqual(before);
});
