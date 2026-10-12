import { Button, Card, Menu, MenuItem, Popover, Tooltip } from "@blueprintjs/core";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  pointerWithin,
  type CollisionDetection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Fragment, useState } from "react";
import { v4 as uuid } from "uuid";
import { Data, PresetSlot, PromptGenerator } from "./data";
import { evaluatePrompt } from "./domain/evaluatePrompt";
import InsertButton from "./InsertButton";
import PresetSelect from "./PresetSelect";
import ResultText from "./ResultText";
import SortablePreset from "./SortablePreset";

const NEW_INSTANCE_DRAG_ID = "__new-prompt-instance";
const DELETE_INSTANCE_DROP_ID = "__delete-prompt-instance";

type DragKind = "instance" | "new-instance";

function InstanceInsertTarget({ index, onClick, newInstanceDragging }: { index: number; onClick: () => void; newInstanceDragging: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `__insert-prompt-instance-${index}`,
    data: { type: "insert", index },
    disabled: !newInstanceDragging,
  });
  const open = newInstanceDragging && isOver;

  return <div
    className={`instance-insert-drop-target${newInstanceDragging ? " is-active" : ""}${open ? " is-over" : ""}`}
    style={{
      position: "relative",
      height: open ? 36 : 8,
      margin: "-3px 0",
      transition: "height 120ms ease",
    }}
  >
    {newInstanceDragging && <div
      ref={setNodeRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        zIndex: 2,
        top: -12,
        left: 0,
        right: 0,
        height: 32,
      }}
    />}
    {newInstanceDragging ? <div
      aria-hidden="true"
      style={open ? {
        position: "absolute",
        inset: 2,
        border: "1px dashed var(--bp6-intent-success)",
        borderRadius: 3,
        background: "color-mix(in srgb, var(--bp6-intent-success) 8%, transparent)",
        pointerEvents: "none",
      } : {
        position: "absolute",
        top: 2,
        left: 0,
        right: 0,
        height: 3,
        borderRadius: 2,
        background: "var(--bp6-intent-success)",
        opacity: 0.35,
        pointerEvents: "none",
      }}
    /> : <InsertButton ariaLabel="インスタンスを挿入" onClick={onClick} />}
  </div>;
}

function AddInstanceButton({ onClick }: { onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: NEW_INSTANCE_DRAG_ID,
    data: { type: "new-instance" },
  });

  return <Button
    ref={setNodeRef}
    {...attributes}
    {...listeners}
    icon="add"
    variant="outlined"
    size="small"
    fill
    onClick={onClick}
    className={`instance-add-button${isDragging ? " is-dragging" : ""}`}
  >
    インスタンスを追加する
  </Button>;
}

function AddInstanceDragOverlay() {
  return <Button
    icon="add"
    variant="outlined"
    size="small"
    fill
    tabIndex={-1}
    style={{ cursor: "grabbing", pointerEvents: "none" }}
  >
    インスタンスを追加する
  </Button>;
}

function ExistingInstanceDragOverlay({ slot, data }: { slot: PresetSlot; data: Data }) {
  return <div className="sortable-preset" style={{ width: "100%", cursor: "grabbing", pointerEvents: "none" }}>
    <Button icon="drag-handle-vertical" variant="minimal" size="small" tabIndex={-1} />
    <PresetSelect slot={slot} data={data} onChange={() => {}} />
  </div>;
}

function DeleteInstanceDropZone() {
  const { setNodeRef, isOver } = useDroppable({
    id: DELETE_INSTANCE_DROP_ID,
    data: { type: "delete" },
  });

  return <div ref={setNodeRef} className={`instance-delete-drop-zone${isOver ? " is-over" : ""}`}>
    <Button icon="trash" intent="danger" variant={isOver ? "solid" : "outlined"} size="small" fill tabIndex={-1}>
      インスタンスを削除する
    </Button>
  </div>;
}

export default function PromptGeneratorForm({ generator, index, data, onChange, onClone, onDelete }: { generator: PromptGenerator; index: number; data: Data; onChange: (g: PromptGenerator) => void; onClone: (source: number, at: number) => void; onDelete: () => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [activeDragKind, setActiveDragKind] = useState<DragKind | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const update = (fn: (g: PromptGenerator) => PromptGenerator) => onChange(fn(generator));
  const insert = (at: number) => update(g => {
    const slots = [...g.presetSlots];
    slots.splice(at, 0, { id: uuid() });
    return { ...g, presetSlots: slots };
  });
  const moveToInsertionPoint = (activeId: string, insertionIndex: number) => update(g => {
    const from = g.presetSlots.findIndex(s => s.id === activeId);
    if (from < 0) return g;
    const slots = [...g.presetSlots];
    const [slot] = slots.splice(from, 1);
    let to = Math.max(0, Math.min(insertionIndex, g.presetSlots.length));
    if (from < to) to -= 1;
    slots.splice(to, 0, slot);
    return { ...g, presetSlots: slots };
  });
  const collisionDetection: CollisionDetection = args => {
    if (args.active.data.current?.type === "new-instance") {
      return pointerWithin({
        ...args,
        droppableContainers: args.droppableContainers.filter(container => container.data.current?.type === "insert"),
      });
    }
    return closestCenter(args);
  };
  const clearDrag = () => {
    setActiveDragKind(null);
    setActiveDragId(null);
  };
  const dragStart = (e: DragStartEvent) => {
    const kind = e.active.data.current?.type === "new-instance" ? "new-instance" : "instance";
    setActiveDragKind(kind);
    setActiveDragId(kind === "instance" ? String(e.active.id) : null);
  };
  const drag = (e: DragEndEvent) => {
    clearDrag();
    if (!e.over) return;

    const kind = e.active.data.current?.type as DragKind | undefined;
    const overType = e.over.data.current?.type;
    const activeId = String(e.active.id);

    if (kind === "new-instance") {
      if (overType === "insert") {
        insert(Number(e.over.data.current?.index));
      }
      return;
    }

    if (kind !== "instance") return;
    if (e.over.id === DELETE_INSTANCE_DROP_ID) {
      update(g => ({ ...g, presetSlots: g.presetSlots.filter(s => s.id !== activeId) }));
      return;
    }
    if (overType === "insert") {
      moveToInsertionPoint(activeId, Number(e.over.data.current?.index));
      return;
    }
    if (e.active.id === e.over.id) return;

    const a = generator.presetSlots.findIndex(s => s.id === activeId);
    const b = generator.presetSlots.findIndex(s => s.id === String(e.over.id));
    if (a >= 0 && b >= 0) update(g => ({ ...g, presetSlots: arrayMove(g.presetSlots, a, b) }));
  };
  const out = evaluatePrompt(generator, data);
  const activeSlot = activeDragId ? generator.presetSlots.find(slot => slot.id === activeDragId) : undefined;

  return <Card compact className="prompt-generator-card">
    <header className="prompt-generator-header">
      <span className="prompt-generator-title">#{index + 1}</span>
      <Popover
        content={<Menu><MenuItem icon="trash" intent="danger" text="削除する" onClick={onDelete} /></Menu>}
        placement="bottom-end"
      >
        <Button icon="more" variant="minimal" size="small" aria-label="プロンプト生成の操作" />
      </Popover>
    </header>
    <section className="prompt-section">
      <h3>プロンプト生成</h3>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={dragStart}
        onDragCancel={clearDrag}
        onDragEnd={drag}
      >
        <SortableContext items={generator.presetSlots.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <InstanceInsertTarget index={0} onClick={() => insert(0)} newInstanceDragging={activeDragKind === "new-instance"} />
          {generator.presetSlots.map((slot, i) => <Fragment key={slot.id}>
            <SortablePreset slot={slot} data={data} onChange={id => update(g => ({ ...g, presetSlots: g.presetSlots.map(s => s.id === slot.id ? { ...s, presetId: id } : s) }))} />
            <InstanceInsertTarget index={i + 1} onClick={() => insert(i + 1)} newInstanceDragging={activeDragKind === "new-instance"} />
          </Fragment>)}
        </SortableContext>
        <AddInstanceButton onClick={() => insert(generator.presetSlots.length)} />
        {activeDragKind === "instance" && <DeleteInstanceDropZone />}
        <DragOverlay dropAnimation={null}>
          {activeDragKind === "new-instance"
            ? <AddInstanceDragOverlay />
            : activeDragKind === "instance" && activeSlot
              ? <ExistingInstanceDragOverlay slot={activeSlot} data={data} />
              : null}
        </DragOverlay>
      </DndContext>
    </section>
    <section className="prompt-section"><h3>生成されたプロンプト</h3><ResultText text={out.prompt} /></section>
    <section className="prompt-section"><h3>生成されたネガティブプロンプト</h3><ResultText text={out.negativePrompt} /></section>
    <footer className="prompt-generator-actions">
      <Tooltip content="左側に複製する"><Button icon="add-column-left" variant="minimal" size="small" aria-label="左側に複製" onClick={() => onClone(index, index)} /></Tooltip>
      <span className="flex-spacer" />
      <Tooltip content="右側に複製する"><Button icon="add-column-right" variant="minimal" size="small" aria-label="右側に複製" onClick={() => onClone(index, index + 1)} /></Tooltip>
    </footer>
  </Card>;
}
