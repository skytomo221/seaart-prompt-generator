// @vitest-environment jsdom
import { useState } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import AttributesTab from "./AttributesTab";
import AttributeGraph from "./AttributeGraph";
import { Data } from "./data";
vi.mock("@xyflow/react", () => ({
  Position: { Top: "top", Bottom: "bottom" },
  ReactFlow: ({ nodes, onNodeClick }: any) => (
    <div>
      {nodes.map((node: any) => (
        <button
          key={node.id}
          aria-pressed={node.selected}
          onClick={() => onNodeClick({}, node)}
        >
          {node.data.label}
        </button>
      ))}
    </div>
  ),
  Background: () => null,
  Controls: () => null,
}));
vi.mock("./AttributeMultiSelect", () => ({
  default: ({ attributes, selectedIds, onChange }: any) => (
    <div>
      {attributes.map((a: any) => (
        <button
          key={a.id}
          onClick={() =>
            onChange(
              selectedIds.includes(a.id)
                ? selectedIds.filter((id: string) => id !== a.id)
                : [...selectedIds, a.id],
            )
          }
        >
          {a.name}
        </button>
      ))}
    </div>
  ),
}));
const data: Data = {
  schemaVersion: 2,
  concepts: [],
  categories: [],
  attributes: [
    { id: "a", name: "人物", implies: [] },
    { id: "b", name: "女性", implies: ["a"] },
    { id: "c", name: "少女", implies: ["b"] },
  ],
};
afterEach(cleanup);
it("calls onSelect on a graph node click and shows an empty state", async () => {
  const onSelect = vi.fn();
  const { rerender } = render(
    <AttributeGraph
      attributes={data.attributes}
      selectedId="a"
      onSelect={onSelect}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "女性" }));
  expect(onSelect).toHaveBeenCalledWith("b");
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "人物" }).getAttribute("aria-pressed"),
    ).toBe("true"),
  );
  rerender(
    <AttributeGraph attributes={[]} selectedId="" onSelect={onSelect} />,
  );
  expect(screen.getByText("属性がありません")).toBeTruthy();
});
it("shares selection between the graph, editor, and list and blocks deleting a referenced parent", () => {
  const onChange = vi.fn();
  const onError = vi.fn();
  function Harness() {
    const [selectedId, onSelect] = useState("a");
    return (
      <AttributesTab
        data={data}
        selectedId={selectedId}
        onSelect={onSelect}
        onChange={onChange}
        onError={onError}
      />
    );
  }
  const { container } = render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "関係図" }));
  fireEvent.click(screen.getByRole("button", { name: "女性" }));
  expect(container.querySelector(".detail-view-fields")?.textContent).toContain(
    "女性親属性人物子属性少女",
  );
  fireEvent.click(screen.getByRole("button", { name: "一覧" }));
  expect(
    container.querySelector(".editor-list-row.is-selected")?.textContent,
  ).toContain("女性");
  fireEvent.click(screen.getByRole("button", { name: "編集する" }));
  fireEvent.click(screen.getByRole("button", { name: "属性を削除" }));
  expect(onError).toHaveBeenCalledWith(expect.stringContaining("少女"));
  expect(onChange).not.toHaveBeenCalled();
});
it("edits both directions through the editor and excludes cycle candidates", () => {
  const onChange = vi.fn();
  const { container } = render(
    <AttributesTab
      data={data}
      selectedId="b"
      onSelect={vi.fn()}
      onChange={onChange}
      onError={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "編集する" }));
  const groups = Array.from(container.querySelectorAll(".bp6-form-group"));
  const parents = groups.find((g) => g.textContent?.includes("親属性"))!;
  const children = groups.find((g) => g.textContent?.includes("子属性"))!;
  expect(parents.textContent).not.toContain("少女");
  expect(children.textContent).not.toContain("人物");
  fireEvent.click(parents.querySelector("button")!);
  expect(onChange.mock.lastCall?.[0].attributes[1].implies).toEqual([]);
  fireEvent.click(children.querySelector("button")!);
  expect(onChange.mock.lastCall?.[0].attributes[2].implies).toEqual([]);
});
