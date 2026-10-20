import { describe, expect, it } from "vitest";
import type { Data, PromptFragmentSet } from "../data";
import {
  parseFragmentSequence,
  formatFragmentSequence,
  findFragmentCycle,
  referencesDefinition,
} from "./PromptFragmentEditor";
import { evaluatePrompt } from "./evaluatePrompt";
import { validateData } from "./validation";

const makeSet = (): PromptFragmentSet => ({
  root: [],
  definitions: [
    { id: "color", name: "色", if: { all: [] }, fragments: ["white"] },
    { id: "pattern", name: "柄", if: { all: [] }, fragments: ["striped"] },
    {
      id: "decor",
      name: "装飾",
      if: { all: [] },
      fragments: ["red", "striped"],
    },
    {
      id: "dress",
      name: "服",
      if: { all: [] },
      fragments: [{ parts: [{ fragmentId: "color" }, " dress"] }],
    },
  ],
});
const ref = (fragmentId: string) => ({ fragmentId });
function fixture(set: PromptFragmentSet): Data {
  return {
    schemaVersion: 2,
    attributes: [],
    categories: [],
    concepts: [
      {
        id: "c",
        name: "C",
        categoryId: "",
        attributeIds: [],
        variantGroups: [],
        presets: [{ id: "p", name: "P", variantSelections: [] }],
        promptFragments: set,
        negativePromptFragments: set,
      },
    ],
  };
}
const generator = {
  id: "g",
  instances: [
    { id: "i", conceptId: "c", presetId: "p", variantSelections: [] },
  ],
};

describe("inline named fragments", () => {
  it.each([
    ["#[色]", ref("color")],
    ["#[色] panties", { parts: [ref("color"), " panties"] }],
    ["panties #[色]", { parts: ["panties ", ref("color")] }],
    [
      "#[色] #[柄] panties",
      { parts: [ref("color"), " ", ref("pattern"), " panties"] },
    ],
    ["#[色]#[柄]", { parts: [ref("color"), ref("pattern")] }],
    ["plain panties", "plain panties"],
  ])("parses and formats %s", (text, fragment) => {
    const set = makeSet();
    expect(parseFragmentSequence(text as string, set)).toEqual({
      fragments: [fragment],
    });
    expect(formatFragmentSequence([fragment as any], set)).toBe(text);
  });
  it("validates every name and preserves comma splitting", () => {
    const set = makeSet();
    expect(
      parseFragmentSequence("#[色] #[存在しない] panties", set).error,
    ).toBe("名前付きフラグメント「存在しない」が見つかりません。");
    set.definitions.push({ ...set.definitions[1], id: "duplicate" });
    expect(parseFragmentSequence("#[色] #[柄] panties", set).error).toBe(
      "名前付きフラグメント名「柄」が重複しています。",
    );
    expect(
      parseFragmentSequence("#[色] panties, shirt", set).fragments,
    ).toEqual([{ parts: [ref("color"), " panties"] }, "shirt"]);
  });
  it("round trips saved IDs using the current name", () => {
    const set = makeSet();
    const saved = JSON.parse(
      JSON.stringify(parseFragmentSequence("#[色] panties", set).fragments),
    );
    set.definitions[0].name = "カラー";
    expect(formatFragmentSequence(saved, set)).toBe("#[カラー] panties");
    set.root = saved;
    expect(evaluatePrompt(generator, fixture(set)).prompt).toBe(
      "white panties",
    );
  });
  it.each([
    ["#[色] panties", "white panties"],
    ["cute #[色] panties", "cute white panties"],
    ["#[色] #[柄] panties", "white striped panties"],
    ["#[色]#[柄]", "whitestriped"],
    ["#[装飾] panties", "red,striped panties"],
    ["#[装飾]panties", "red,stripedpanties"],
    ["#[服]", "white dress"],
    ["fancy #[服]", "fancy white dress"],
    ["same, #[色], same, #[装飾]", "same,white,same,red,striped"],
  ])("evaluates positive and negative %s", (text, expected) => {
    const set = makeSet();
    set.root = parseFragmentSequence(text, set).fragments!;
    const result = evaluatePrompt(generator, fixture(set));
    expect(result.prompt).toBe(expected);
    expect(result.negativePrompt).toBe(expected);
  });
  it("preserves spaces when a condition fails", () => {
    const set = makeSet();
    set.definitions[2].if = { any: [] };
    set.root = parseFragmentSequence("cute #[装飾] panties", set).fragments!;
    expect(evaluatePrompt(generator, fixture(set)).prompt).toBe(
      "cute  panties",
    );
  });
  it("uses each instance's variant selection for inline references", () => {
    const set = makeSet();
    set.definitions[0].fragments = [];
    set.definitions[0].if = {
      selfVariantGroup: {
        groupId: "g",
        cases: [
          { variantId: "white", fragments: ["white"] },
          { variantId: "black", fragments: ["black"] },
        ],
      },
    };
    set.root = parseFragmentSequence("#[色] panties", set).fragments!;
    const data = fixture(set);
    data.concepts[0].variantGroups = [
      {
        id: "g",
        name: "G",
        variants: [
          { id: "white", name: "White", attributeIds: [] },
          { id: "black", name: "Black", attributeIds: [] },
        ],
      },
    ];
    const instances = ["white", "black"].map((variantId) => ({
      ...generator.instances[0],
      id: variantId,
      variantSelections: [{ groupId: "g", variantId }],
    }));
    const result = evaluatePrompt({ ...generator, instances }, data);
    expect(result.prompt).toBe("white panties,black panties");
    expect(result.negativePrompt).toBe("white panties,black panties");
  });
  it("checks inline references in roots, definitions and variant cases", () => {
    const set = makeSet();
    expect(referencesDefinition(set, "color")).toBe(true);
    set.root = [{ parts: ["x", ref("pattern")] }];
    expect(referencesDefinition(set, "pattern")).toBe(true);
    set.definitions[3].if = {
      selfVariantGroup: {
        groupId: "g",
        cases: [
          { variantId: "v", fragments: [{ parts: [ref("decor"), "!"] }] },
        ],
      },
    };
    expect(referencesDefinition(set, "decor")).toBe(true);
  });
  it("validates templates and detects inline cycles including imported data", () => {
    const set = makeSet();
    const data = fixture(set);
    const before = validateData(data);
    set.root = [{ parts: [ref("color"), " "] }];
    expect(validateData(data)).toEqual(before);
    set.root = [{ parts: [ref("missing"), "x"] }];
    expect(
      validateData(data).some((e) =>
        e.includes("missing named fragment missing"),
      ),
    ).toBe(true);
    set.definitions[0].fragments = [{ parts: [ref("pattern"), " foo"] }];
    set.definitions[1].fragments = [{ parts: [ref("color"), " bar"] }];
    expect(findFragmentCycle(set)).toEqual(["color", "pattern", "color"]);
    expect(
      validateData(data).some((e) =>
        e.includes("named fragment reference cycle"),
      ),
    ).toBe(true);
  });
});
