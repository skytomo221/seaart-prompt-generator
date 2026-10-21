import { Button, ContextMenu, mergeRefs } from "@blueprintjs/core";
import type { CSSProperties, MutableRefObject, ReactElement } from "react";
import { useLayoutEffect, useRef } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import InsertButton from "./InsertButton";

function Row({
  id,
  name,
  selected,
  onSelect,
  itemStyle,
  contextMenu,
}: {
  id: string;
  name: string;
  selected: boolean;
  onSelect: () => void;
  itemStyle?: CSSProperties;
  contextMenu?: ReactElement;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  const renderRow = (
    onContextMenu?: React.MouseEventHandler<HTMLElement>,
    contextRef?: React.Ref<HTMLDivElement>,
    popover?: ReactElement,
  ) => (
    <div
      onContextMenu={onContextMenu}
      ref={mergeRefs(setNodeRef, contextRef)}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        ...itemStyle,
        ...(selected && itemStyle
          ? { boxShadow: "inset 0 0 0 2px var(--bp6-intent-primary, #2d72d2)" }
          : {}),
      }}
      className={`editor-list-row${selected ? " is-selected" : ""}`}
    >
      {popover}
      <Button
        {...attributes}
        {...listeners}
        icon="drag-handle-vertical"
        variant="minimal"
        size="small"
        className="editor-list-drag-handle"
        aria-label="ドラッグして並べ替え"
        style={{ color: "inherit" }}
      />
      <button
        className="editor-list-select"
        onClick={onSelect}
        style={{ color: "inherit" }}
      >
        {name || "（名前なし）"}
      </button>
    </div>
  );
  return contextMenu ? (
    <ContextMenu content={contextMenu}>
      {({ onContextMenu, ref, popover }) =>
        renderRow(onContextMenu, ref, popover)
      }
    </ContextMenu>
  ) : (
    renderRow()
  );
}

export default function EntityListPane({
  items,
  selectedId,
  onSelect,
  onAdd,
  onReorder,
  scrollTopRef,
  itemStyles,
  renderContextMenu,
}: {
  items: { id: string; name: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAdd: (at: number) => void;
  onReorder: (items: { id: string; name: string }[]) => void;
  scrollTopRef: MutableRefObject<number>;
  itemStyles?: Record<string, CSSProperties | undefined>;
  renderContextMenu?: (item: {
    id: string;
    name: string;
  }) => ReactElement | undefined;
}) {
  const sensors = useSensors(useSensor(PointerSensor));
  const listRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (listRef.current) listRef.current.scrollTop = scrollTopRef.current;
  }, [scrollTopRef]);
  const drag = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = items.findIndex((x) => x.id === e.active.id),
      to = items.findIndex((x) => x.id === e.over!.id);
    if (from >= 0 && to >= 0) onReorder(arrayMove(items, from, to));
  };
  return (
    <aside
      ref={listRef}
      className="editor-list-pane"
      onScroll={(event) => {
        scrollTopRef.current = event.currentTarget.scrollTop;
      }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={drag}
      >
        <SortableContext
          items={items.map((x) => x.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="editor-list-items">
            {items.map((x, i) => (
              <div key={x.id}>
                <Row
                  {...x}
                  contextMenu={renderContextMenu?.(x)}
                  selected={selectedId === x.id}
                  onSelect={() => onSelect(x.id)}
                  itemStyle={itemStyles?.[x.id]}
                />
                {i < items.length - 1 && (
                  <InsertButton
                    ariaLabel="項目を挿入"
                    onClick={() => onAdd(i + 1)}
                  />
                )}
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <Button
        icon="add"
        variant="outlined"
        size="small"
        fill
        onClick={() => onAdd(items.length)}
      >
        追加
      </Button>
    </aside>
  );
}
