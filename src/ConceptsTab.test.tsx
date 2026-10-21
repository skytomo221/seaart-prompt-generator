// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import ConceptsTab from "./ConceptsTab";
import EntityListPane from "./EntityListPane";
import type { Concept, Data } from "./data";

vi.mock("./ConceptEditor", () => ({ default: () => null }));
afterEach(cleanup);
const concept = (id: string): Concept => ({
  id,
  name: id,
  categoryId: "",
  attributeIds: [],
  variantGroups: [],
  presets: [],
  promptFragments: { root: [], definitions: [] },
  negativePromptFragments: { root: [], definitions: [] },
});
function setup(selectedId = "a", referenced = false) {
  const data: Data = {
    schemaVersion: 2,
    categories: [],
    attributes: [],
    concepts: [concept("a"), concept("b"), concept("c")],
  };
  if (referenced) {
    data.concepts[1].variantGroups = [{ id: "g", name: "group", variants: [] }];
    data.concepts[2].promptFragments.definitions = [
      {
        id: "f",
        name: "reference",
        fragments: [],
        if: { selfVariantGroup: { groupId: "g", cases: [] } },
      },
    ];
  }
  const onChange = vi.fn(),
    onSelect = vi.fn(),
    onError = vi.fn();
  render(
    <ConceptsTab
      data={data}
      generators={{ schemaVersion: 2, promptGenerators: [] }}
      selectedId={selectedId}
      onChange={onChange}
      onSelect={onSelect}
      onError={onError}
      scrollTopRef={{ current: 0 }}
    />,
  );
  return { data, onChange, onSelect, onError };
}
function open(name: string) {
  const event = new MouseEvent("contextmenu", {
    bubbles: true,
    cancelable: true,
    clientX: 20,
    clientY: 20,
  });
  fireEvent(screen.getByRole("button", { name }), event);
  expect(event.defaultPrevented).toBe(true);
}
it.each([
  ["上に複製する", 1],
  ["下に複製する", 2],
] as const)(
  "%s inserts next to the target and selects the copy",
  (label, index) => {
    const { data, onChange, onSelect } = setup();
    open("b");
    expect(
      screen.getAllByRole("menuitem").map((item) => item.textContent),
    ).toEqual(["上に複製する", "下に複製する", "削除する"]);
    expect(
      screen.getByRole("menuitem", { name: "削除する" }).className,
    ).toContain("bp6-intent-danger");
    fireEvent.click(screen.getByRole("menuitem", { name: label }));
    const next: Data = onChange.mock.calls[0][0];
    const copy = next.concepts[index];
    expect(copy.name).toBe("b");
    expect(copy.id).not.toBe("b");
    expect(next.concepts.filter((item) => item.id !== copy.id)).toEqual(
      data.concepts,
    );
    expect(onSelect).toHaveBeenCalledWith(copy.id);
  },
);
it.each(["a", "b"])("deletes the target while selected=%s", (selected) => {
  const { onChange, onSelect } = setup(selected);
  open("b");
  fireEvent.click(screen.getByRole("menuitem", { name: "削除する" }));
  expect(
    onChange.mock.calls[0][0].concepts.map((item: Concept) => item.id),
  ).toEqual(["a", "c"]);
  if (selected === "b") expect(onSelect).toHaveBeenCalledWith("");
  else expect(onSelect).not.toHaveBeenCalled();
});
it("checks references owned by the unselected target before deleting", () => {
  const { onChange, onSelect, onError } = setup("a", true);
  open("b");
  fireEvent.click(screen.getByRole("menuitem", { name: "削除する" }));
  expect(onChange).not.toHaveBeenCalled();
  expect(onSelect).not.toHaveBeenCalled();
  expect(onError).toHaveBeenCalledWith(expect.stringContaining("group"));
});
it("keeps the native context menu when no extension is supplied", () => {
  render(
    <EntityListPane
      items={[{ id: "a", name: "a" }]}
      selectedId=""
      onSelect={vi.fn()}
      onAdd={vi.fn()}
      onReorder={vi.fn()}
      scrollTopRef={{ current: 0 }}
    />,
  );
  const event = new MouseEvent("contextmenu", {
    bubbles: true,
    cancelable: true,
  });
  fireEvent(screen.getByRole("button", { name: "a" }), event);
  expect(event.defaultPrevented).toBe(false);
  expect(screen.queryByRole("menu")).toBeNull();
});
