// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import PromptGeneratorsTab from "./PromptGeneratorsTab";
import { Data, PromptGenerator } from "./data";
import * as evaluator from "./domain/evaluatePrompt";

const mocks = vi.hoisted(() => ({ contexts: [] as any[], selects: vi.fn() }));
vi.mock("./ResultText", () => ({
  default: ({ text }: any) => <output>{text}</output>,
  ResultCopyStatusProvider: ({ children }: any) => children,
}));
vi.mock("@dnd-kit/core", async (original) => ({
  ...(await original<any>()),
  DndContext: (props: any) => {
    mocks.contexts.push(props);
    return props.children;
  },
  DragOverlay: ({ children }: any) => <aside>{children}</aside>,
  useDraggable: () => ({ attributes: {}, listeners: {}, setNodeRef: vi.fn() }),
  useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
}));
vi.mock("@dnd-kit/sortable", async (original) => ({
  ...(await original<any>()),
  SortableContext: ({ children }: any) => children,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    setActivatorNodeRef: vi.fn(),
  }),
}));
vi.mock("@blueprintjs/select", () => ({
  Suggest: (props: any) => {
    mocks.selects(props.items);
    return (
      <select
        value={props.selectedItem.id}
        onChange={(event) =>
          props.onItemSelect(
            props.items.find((item: any) => item.id === event.target.value),
          )
        }
      >
        {props.items.map((item: any) => (
          <option key={item.id} value={item.id}>
            {props.inputValueRenderer(item)}
          </option>
        ))}
      </select>
    );
  },
}));
const data: Data = {
  schemaVersion: 2,
  attributes: [],
  categories: [],
  concepts: [
    {
      id: "c",
      name: "concept",
      categoryId: "",
      attributeIds: [],
      variantGroups: [
        {
          id: "g",
          name: "group",
          variants: [{ id: "v", name: "variant", attributeIds: [] }],
        },
      ],
      presets: [{ id: "p", name: "preset", variantSelections: [] }],
      promptFragments: { root: ["tag"], definitions: [] },
      negativePromptFragments: { root: [], definitions: [] },
    },
  ],
};
function generators(): PromptGenerator[] {
  return Array.from({ length: 5 }, (_, i) => ({
    id: `form-${i}`,
    instances: Array.from({ length: 10 }, (_, j) => ({
      id: `instance-${i}-${j}`,
      conceptId: "c",
      presetId: "p",
      variantSelections: [],
    })),
  }));
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  mocks.contexts = [];
  mocks.selects.mockClear();
});

it("shares options and isolates other forms/instances when editing one instance", () => {
  const evaluate = vi.spyOn(evaluator, "evaluatePrompt");
  const initial = generators();
  const onChange = vi.fn();
  const { rerender } = render(
    <PromptGeneratorsTab
      data={data}
      generators={initial}
      onChange={onChange}
    />,
  );
  const sharedOptions = mocks.selects.mock.calls[0][0];
  expect(
    mocks.selects.mock.calls.every(([items]) => items === sharedOptions),
  ).toBe(true);
  evaluate.mockClear();
  mocks.selects.mockClear();
  fireEvent.change(screen.getAllByRole("combobox")[20], {
    target: { value: "__blank" },
  });
  const next = onChange.mock.calls[0][0];
  expect(next[0]).toBe(initial[0]);
  expect(next[2].instances[1]).toBe(initial[2].instances[1]);
  rerender(
    <PromptGeneratorsTab data={data} generators={next} onChange={onChange} />,
  );
  expect(evaluate.mock.calls.map(([generator]) => generator.id)).toEqual([
    "form-2",
  ]);
  expect(
    mocks.selects.mock.calls.every(([items]) => items === sharedOptions),
  ).toBe(true);
  // Only the edited instance's Suggest is visited; unrelated heavy instance contents are skipped.
  expect(mocks.selects).toHaveBeenCalledTimes(1);
  evaluate.mockClear();
  mocks.selects.mockClear();
  rerender(
    <PromptGeneratorsTab
      data={data}
      generators={[...next]}
      onChange={onChange}
    />,
  );
  expect(evaluate).not.toHaveBeenCalled();
  expect(mocks.selects).not.toHaveBeenCalled();
});

it("preserves click add, drag insert/reorder/delete, form reorder and skips evaluation for drag state", () => {
  const evaluate = vi.spyOn(evaluator, "evaluatePrompt");
  let latest = generators();
  function Harness() {
    const [value, setValue] = useState(latest);
    latest = value;
    return (
      <PromptGeneratorsTab data={data} generators={value} onChange={setValue} />
    );
  }
  render(<Harness />);
  const inner = () =>
    mocks.contexts.filter((props) => props.onDragStart).slice(-1)[0];
  const outer = () =>
    mocks.contexts.filter((props) => !props.onDragStart).slice(-1)[0];
  const event = (
    id: string,
    type: string,
    overId: string,
    overType = "instance",
    index?: number,
  ) => ({
    active: { id, data: { current: { type } } },
    over: { id: overId, data: { current: { type: overType, index } } },
  });
  evaluate.mockClear();
  act(() => inner().onDragStart(event("new", "new-instance", "insert")));
  expect(evaluate).not.toHaveBeenCalled();
  act(() =>
    inner().onDragEnd(event("new", "new-instance", "insert", "insert", 3)),
  );
  const added = latest[4].instances[3];
  expect(latest[4].instances).toHaveLength(11);
  expect(added.variantSelections).toEqual([]);
  act(() => inner().onDragEnd(event(added.id, "instance", "instance-4-0")));
  expect(latest[4].instances[0]).toBe(added);
  act(() =>
    inner().onDragEnd(
      event(added.id, "instance", "__delete-prompt-instance", "delete"),
    ),
  );
  expect(latest[4].instances).toHaveLength(10);
  fireEvent.click(
    screen.getAllByRole("button", { name: "インスタンスを追加する" })[4],
  );
  expect(latest[4].instances).toHaveLength(11);
  const first = latest[0];
  act(() => outer().onDragEnd(event(first.id, "form", "form-1")));
  expect(latest[1]).toBe(first);
});
