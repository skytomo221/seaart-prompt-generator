// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { DragEndEvent } from "@dnd-kit/core";
import type { ReactNode } from "react";
import type { Data, PromptFragmentSet } from "../data";
import PromptFragmentEditor, {
  reorderDefinitions,
} from "./PromptFragmentEditor";
import { evaluatePrompt } from "./evaluatePrompt";

const dnd = vi.hoisted(() => ({
  end: undefined as undefined | ((event: DragEndEvent) => void),
  start: vi.fn(),
  draggingId: undefined as string | undefined,
}));
vi.mock("@dnd-kit/core", async (original) => ({
  ...(await original<typeof import("@dnd-kit/core")>()),
  DndContext: ({
    children,
    onDragEnd,
  }: {
    children: ReactNode;
    onDragEnd: typeof dnd.end;
  }) => {
    dnd.end = onDragEnd;
    return <>{children}</>;
  },
}));
vi.mock("@dnd-kit/sortable", async (original) => ({
  ...(await original<typeof import("@dnd-kit/sortable")>()),
  useSortable: ({ id }: { id: string }) => ({
    isDragging: id === dnd.draggingId,
    transform:
      id === dnd.draggingId ? { x: 12, y: 80, scaleX: 0.8, scaleY: 1.7 } : null,
    transition: "transform 200ms ease",
    attributes: {},
    listeners: { onPointerDown: dnd.start },
    setNodeRef: vi.fn(),
    setActivatorNodeRef: vi.fn(),
  }),
}));

const makeSet = (): PromptFragmentSet => ({
  root: ["prefix", { fragmentId: "a" }, { fragmentId: "c" }],
  definitions: [
    {
      id: "a",
      name: "A",
      if: { all: [] },
      fragments: ["alpha", { fragmentId: "b" }],
    },
    { id: "b", name: "B", if: { all: [] }, fragments: ["beta"] },
    { id: "c", name: "C", if: { all: [] }, fragments: ["gamma"] },
  ],
});
const props = {
  concepts: [],
  categories: [],
  attributes: [],
  label: "フラグメント",
};
afterEach(() => {
  cleanup();
  dnd.draggingId = undefined;
  vi.clearAllMocks();
});

it("reorders only definitions, preserving objects, references and serialized order", () => {
  const value = makeSet();
  const before = JSON.stringify(value);
  const next = reorderDefinitions(value, "c", "a");
  expect(next.definitions.map((item) => item.id)).toEqual(["c", "a", "b"]);
  expect(next.root).toBe(value.root);
  for (const item of next.definitions) {
    expect(item).toBe(
      value.definitions.find((original) => original.id === item.id),
    );
  }
  expect(JSON.stringify(value)).toBe(before);
  expect(
    JSON.parse(JSON.stringify(next)).definitions.map(
      (item: { id: string }) => item.id,
    ),
  ).toEqual(["c", "a", "b"]);
  for (const [active, over] of [
    ["a", "a"],
    ["missing", "a"],
    ["a", "missing"],
  ]) {
    expect(reorderDefinitions(value, active, over)).toBe(value);
  }
});

it.each([false, true])(
  "connects drag end to onChange and limits activation to handles (negative=%s)",
  (negative) => {
    const value = makeSet();
    const onChange = vi.fn();
    const { container, rerender } = render(
      <PromptFragmentEditor {...props} {...{ value, onChange, negative }} />,
    );
    const handles = screen.getAllByRole("button", {
      name: "ドラッグして並べ替え",
    });
    expect(handles).toHaveLength(3);
    container
      .querySelectorAll("input, textarea, .named-fragment-card")
      .forEach((node) => fireEvent.pointerDown(node));
    screen
      .getAllByRole("button")
      .filter((button) => !handles.includes(button))
      .forEach((button) => fireEvent.pointerDown(button));
    expect(dnd.start).not.toHaveBeenCalled();
    fireEvent.pointerDown(handles[0]);
    expect(dnd.start).toHaveBeenCalledOnce();
    const end = (active: string, over: string | null) =>
      dnd.end!({
        active: { id: active },
        over: over ? { id: over } : null,
      } as DragEndEvent);
    end("c", null);
    end("a", "a");
    end("missing", "a");
    expect(onChange).not.toHaveBeenCalled();
    end("c", "a");
    expect(onChange).toHaveBeenCalledExactlyOnceWith(
      reorderDefinitions(value, "c", "a"),
    );
    const saved = JSON.parse(JSON.stringify(onChange.mock.calls[0][0]));
    rerender(
      <PromptFragmentEditor
        {...props}
        value={saved}
        onChange={onChange}
        negative={negative}
        readOnly
      />,
    );
    expect(
      screen.queryByRole("button", { name: "ドラッグして並べ替え" }),
    ).toBeNull();
    expect(
      [...container.querySelectorAll(".named-fragment-card")].map(
        (card) => card.firstElementChild?.textContent,
      ),
    ).toEqual(["名前：#[C]", "名前：#[A]", "名前：#[B]"]);
  },
);

it("preserves positive and negative prompt output when definitions are reordered", () => {
  const data: Data = {
    schemaVersion: 2,
    attributes: [],
    categories: [],
    concepts: [
      {
        id: "concept",
        name: "Concept",
        categoryId: "",
        attributeIds: [],
        variantGroups: [],
        presets: [{ id: "preset", name: "Preset", variantSelections: [] }],
        promptFragments: makeSet(),
        negativePromptFragments: makeSet(),
      },
    ],
  };
  const generator = {
    id: "generator",
    instances: [
      {
        id: "instance",
        conceptId: "concept",
        presetId: "preset",
        variantSelections: [],
      },
    ],
  };
  const before = evaluatePrompt(generator, data);
  expect(before.prompt).toBe("prefix,alpha,beta,gamma");
  expect(before.negativePrompt).toBe(before.prompt);
  for (const key of ["promptFragments", "negativePromptFragments"] as const) {
    data.concepts[0][key] = reorderDefinitions(data.concepts[0][key], "c", "a");
  }
  const after = evaluatePrompt(generator, data);
  expect(after.prompt).toBe(before.prompt);
  expect(after.negativePrompt).toBe(before.negativePrompt);
});

it("keeps the dragged card at its original size while translating above other cards", () => {
  dnd.draggingId = "c";
  const { container } = render(
    <PromptFragmentEditor {...props} value={makeSet()} onChange={vi.fn()} />,
  );
  const cards = container.querySelectorAll<HTMLElement>(".named-fragment-card");
  expect(cards[2].style.transform).toBe("translate3d(12px, 80px, 0)");
  expect(cards[2].style.transition).toBe("transform 200ms ease");
  expect(cards[2].style.opacity).toBe("0.3");
  expect(cards[2].style.position).toBe("relative");
  expect(cards[2].style.zIndex).toBe("1");
  expect(cards[0].style.transform).toBe("");
  expect(cards[0].style.zIndex).toBe("");
});
