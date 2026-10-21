import { describe, expect, it } from "vitest";
import { Data } from "../data";
import {
  canAddAttributeParent,
  getAttributeChildren,
  setAttributeParents,
  setAttributeChildren,
} from "./attributeRelations";
import { getDeletionReferences } from "./references";
const base = (): Data => ({
  schemaVersion: 2,
  concepts: [],
  categories: [],
  attributes: ["a", "b", "c", "d"].map((id) => ({ id, name: id, implies: [] })),
});
describe("attribute relations", () => {
  it("adds and removes parents without mutating the input", () => {
    const original = base();
    const added = setAttributeParents(original, "a", ["b"]);
    expect(added.attributes[0].implies).toEqual(["b"]);
    expect(original.attributes[0].implies).toEqual([]);
    expect(setAttributeParents(added, "a", []).attributes[0].implies).toEqual(
      [],
    );
  });
  it("adds and removes children, preserving other parents", () => {
    const original = setAttributeParents(base(), "b", ["c"]);
    const added = setAttributeChildren(original, "a", ["b", "d"]);
    expect(added.attributes[1].implies).toEqual(["c", "a"]);
    expect(
      getAttributeChildren(added.attributes, "a").map((a) => a.id),
    ).toEqual(["b", "d"]);
    const removed = setAttributeChildren(added, "a", []);
    expect(removed.attributes[1].implies).toEqual(["c"]);
    expect(removed.attributes[3].implies).toEqual([]);
  });
  it.each(["parents", "children"])(
    "rejects self, direct and indirect cycles through %s",
    (mode) => {
      const set =
        mode === "parents" ? setAttributeParents : setAttributeChildren;
      expect(() => set(base(), "a", ["a"])).toThrow();
      const direct = set(base(), "a", ["b"]);
      expect(() => set(direct, "b", ["a"])).toThrow();
      const indirect = set(direct, "b", ["c"]);
      expect(() => set(indirect, "c", ["a"])).toThrow();
    },
  );
  it("filters unsafe candidates and preserves deletion references", () => {
    const data = setAttributeParents(
      setAttributeParents(base(), "a", ["b"]),
      "b",
      ["c"],
    );
    expect(canAddAttributeParent(data.attributes, "c", "a")).toBe(false);
    expect(canAddAttributeParent(data.attributes, "a", "d")).toBe(true);
    expect(
      getDeletionReferences("attribute", "b", data, {
        schemaVersion: 2,
        promptGenerators: [],
      }),
    ).toContain("子属性「a」");
  });
  it("rejects an entire invalid batch without changing original data", () => {
    const data = setAttributeParents(base(), "a", ["b"]);
    expect(() => setAttributeChildren(data, "a", ["c", "b"])).toThrow();
    expect(data.attributes[2].implies).toEqual([]);
  });
});
