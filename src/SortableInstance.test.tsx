import { createDataIndex } from "./domain/dataIndex";
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import SortableInstance from "./SortableInstance";
import type { Data, ConceptInstance } from "./data";

const { dragStart } = vi.hoisted(() => ({ dragStart: vi.fn() }));
vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: { onPointerDown: dragStart },
    setNodeRef: vi.fn(),
  }),
}));
// Exercise selection callbacks without Blueprint's portalled popup mechanics.
vi.mock("@blueprintjs/select", () => ({
  Suggest: ({ items, selectedItem, inputValueRenderer, onItemSelect }: any) => (
    <select
      value={selectedItem.id}
      onChange={(event) =>
        onItemSelect(items.find((item: any) => item.id === event.target.value))
      }
    >
      {items.map((item: any) => (
        <option key={item.id} value={item.id}>
          {inputValueRenderer(item)}
        </option>
      ))}
    </select>
  ),
}));

const data: Data = {
  schemaVersion: 2,
  attributes: [],
  categories: [],
  concepts: [
    {
      id: "skirt",
      name: "スカート",
      categoryId: "",
      attributeIds: [],
      variantGroups: [
        {
          id: "color",
          name: "色",
          variants: [
            { id: "black", name: "黒", attributeIds: [] },
            { id: "white", name: "白", attributeIds: [] },
          ],
        },
        {
          id: "length",
          name: "丈",
          variants: [{ id: "mini", name: "ミニ", attributeIds: [] }],
        },
      ],
      presets: [
        {
          id: "black-skirt",
          name: "スカート（黒）",
          variantSelections: [{ groupId: "color", variantId: "black" }],
        },
      ],
      promptFragments: { root: [], definitions: [] },
      negativePromptFragments: { root: [], definitions: [] },
    },
    {
      id: "girl",
      name: "少女",
      categoryId: "",
      attributeIds: [],
      variantGroups: [],
      presets: [{ id: "girl-preset", name: "少女", variantSelections: [] }],
      promptFragments: { root: [], definitions: [] },
      negativePromptFragments: { root: [], definitions: [] },
    },
  ],
};
const dataIndex = createDataIndex(data);
const instance: ConceptInstance = {
  id: "a",
  conceptId: "skirt",
  presetId: "black-skirt",
  variantSelections: [{ groupId: "color", variantId: "black" }],
};
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("starts collapsed, exposes all groups, and preserves selection and handle callbacks", () => {
  const onVariantChange = vi.fn();
  const { container } = render(
    <SortableInstance
      instance={instance}
      dataIndex={dataIndex}
      onPresetChange={vi.fn()}
      onVariantChange={onVariantChange}
    />,
  );
  expect(screen.queryByText("色：")).toBeNull();
  const toggle = screen.getByRole("button", { name: "Variant詳細を開く" });
  expect(container.querySelector('[data-icon="chevron-down"]')).not.toBeNull();
  fireEvent.pointerDown(toggle);
  fireEvent.click(toggle);
  expect(dragStart).not.toHaveBeenCalled();
  expect(toggle.getAttribute("aria-expanded")).toBe("true");
  expect(container.querySelector('[data-icon="chevron-up"]')).not.toBeNull();
  expect(screen.getByText("丈：")).not.toBeNull();
  expect(screen.getByText("色：")).not.toBeNull();
  fireEvent.change(screen.getAllByRole("combobox")[1], {
    target: { value: "white" },
  });
  expect(onVariantChange).toHaveBeenCalledWith("a", "color", "white");
  fireEvent.click(toggle);
  expect(screen.queryByText("色：")).toBeNull();
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  fireEvent.pointerDown(
    screen.getByRole("button", { name: "ドラッグして並べ替え" }),
  );
  expect(dragStart).toHaveBeenCalledOnce();
});

it("collapses on preset selection and hides details and toggle for blank or groupless concepts", () => {
  const onPresetChange = vi.fn();
  const props = {
    instance,
    dataIndex,
    onPresetChange,
    onVariantChange: vi.fn(),
  };
  const { rerender, container } = render(<SortableInstance {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Variant詳細を開く" }));
  fireEvent.change(screen.getAllByRole("combobox")[0], {
    target: { value: "girl-preset" },
  });
  expect(onPresetChange).toHaveBeenLastCalledWith("a", "girl-preset");
  expect(screen.queryByText("色：")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Variant詳細を開く" }));
  fireEvent.change(screen.getAllByRole("combobox")[0], {
    target: { value: "__blank" },
  });
  expect(onPresetChange).toHaveBeenLastCalledWith("a", undefined);
  expect(screen.queryByText("色：")).toBeNull();
  for (const next of [
    { id: "a", variantSelections: [] },
    {
      id: "a",
      conceptId: "girl",
      presetId: "girl-preset",
      variantSelections: [],
    },
  ]) {
    rerender(<SortableInstance {...props} instance={next} />);
    expect(screen.queryByRole("button", { name: /Variant詳細/ })).toBeNull();
    expect(screen.queryByText("色：")).toBeNull();
    const row = container.firstElementChild!.firstElementChild!;
    expect(row.children.length).toBe(2);
    expect((row.lastElementChild as HTMLElement).style.flex).toBe("1 1 auto");
    expect((row as HTMLElement).style.width).toBe("100%");
  }
});

it("allows multiple instances to stay expanded independently", () => {
  render(
    <>
      {[instance, { ...instance, id: "b" }].map((item) => (
        <SortableInstance
          key={item.id}
          instance={item}
          dataIndex={dataIndex}
          onPresetChange={vi.fn()}
          onVariantChange={vi.fn()}
        />
      ))}
    </>,
  );
  fireEvent.click(
    screen.getAllByRole("button", { name: "Variant詳細を開く" })[0],
  );
  expect(screen.getAllByText("色：")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Variant詳細を開く" }));
  expect(screen.getAllByText("色：")).toHaveLength(2);
  fireEvent.click(
    screen.getAllByRole("button", { name: "Variant詳細を閉じる" })[0],
  );
  expect(screen.getAllByText("色：")).toHaveLength(1);
});
