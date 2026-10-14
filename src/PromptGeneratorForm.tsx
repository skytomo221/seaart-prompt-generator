import {
  Button,
  Card,
  Menu,
  MenuItem,
  Popover,
  Tooltip,
} from "@blueprintjs/core";
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
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Fragment, useState } from "react";
import { v4 as uuid } from "uuid";
import { ConceptInstance, Data, PromptGenerator } from "./data";
import { evaluatePrompt } from "./domain/evaluatePrompt";
import { findPreset } from "./domain/presets";
import InsertButton from "./InsertButton";
import PresetSelect from "./PresetSelect";
import ResultText from "./ResultText";
import SortableInstance from "./SortableInstance";

const NEW_INSTANCE_DRAG_ID = "__new-prompt-instance";
const DELETE_INSTANCE_DROP_ID = "__delete-prompt-instance";

type DragKind = "instance" | "new-instance";

function InstanceInsertTarget({
  index,
  onClick,
  newInstanceDragging,
}: {
  index: number;
  onClick: () => void;
  newInstanceDragging: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `__insert-prompt-instance-${index}`,
    data: { type: "insert", index },
    disabled: !newInstanceDragging,
  });
  const open = newInstanceDragging && isOver;

  return (
    <div
      className={`instance-insert-drop-target${newInstanceDragging ? " is-active" : ""}${open ? " is-over" : ""}`}
      style={{
        position: "relative",
        height: open ? 36 : 8,
        margin: "-3px 0",
        transition: "height 120ms ease",
      }}
    >
      {newInstanceDragging && (
        <div
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
        />
      )}
      {newInstanceDragging ? (
        <div
          aria-hidden="true"
          style={
            open
              ? {
                  position: "absolute",
                  inset: 2,
                  border: "1px dashed var(--bp6-intent-success)",
                  borderRadius: 3,
                  background:
                    "color-mix(in srgb, var(--bp6-intent-success) 8%, transparent)",
                  pointerEvents: "none",
                }
              : {
                  position: "absolute",
                  top: 2,
                  left: 0,
                  right: 0,
                  height: 3,
                  borderRadius: 2,
                  background: "var(--bp6-intent-success)",
                  opacity: 0.35,
                  pointerEvents: "none",
                }
          }
        />
      ) : (
        <InsertButton ariaLabel="インスタンスを挿入" onClick={onClick} />
      )}
    </div>
  );
}

function AddInstanceButton({ onClick }: { onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: NEW_INSTANCE_DRAG_ID,
    data: { type: "new-instance" },
  });

  return (
    <Button
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
    </Button>
  );
}

function AddInstanceDragOverlay() {
  return (
    <Button
      icon="add"
      variant="outlined"
      size="small"
      fill
      tabIndex={-1}
      style={{ cursor: "grabbing", pointerEvents: "none" }}
    >
      インスタンスを追加する
    </Button>
  );
}

function ExistingInstanceDragOverlay({
  instance,
  data,
}: {
  instance: ConceptInstance;
  data: Data;
}) {
  return (
    <div
      className="instance-main-row"
      style={{ width: "100%", cursor: "grabbing", pointerEvents: "none" }}
    >
      <Button
        icon="drag-handle-vertical"
        variant="minimal"
        size="small"
        tabIndex={-1}
      />
      <PresetSelect
        presetId={instance.presetId}
        data={data}
        onChange={() => {}}
      />
    </div>
  );
}

function DeleteInstanceDropZone() {
  const { setNodeRef, isOver } = useDroppable({
    id: DELETE_INSTANCE_DROP_ID,
    data: { type: "delete" },
  });

  return (
    <div
      ref={setNodeRef}
      className={`instance-delete-drop-zone${isOver ? " is-over" : ""}`}
    >
      <Button
        icon="trash"
        intent="danger"
        variant={isOver ? "solid" : "outlined"}
        size="small"
        fill
        tabIndex={-1}
      >
        インスタンスを削除する
      </Button>
    </div>
  );
}

export default function PromptGeneratorForm({
  generator,
  index,
  data,
  onChange,
  onClone,
  onDelete,
}: {
  generator: PromptGenerator;
  index: number;
  data: Data;
  onChange: (g: PromptGenerator) => void;
  onClone: (source: number, at: number) => void;
  onDelete: () => void;
}) {
  const {
    attributes: formDragAttributes,
    listeners: formDragListeners,
    setNodeRef: setFormNodeRef,
    setActivatorNodeRef: setFormDragHandleRef,
    transform: formTransform,
    transition: formTransition,
    isDragging: isFormDragging,
  } = useSortable({ id: generator.id });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );
  const [activeDragKind, setActiveDragKind] = useState<DragKind | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const update = (fn: (g: PromptGenerator) => PromptGenerator) =>
    onChange(fn(generator));
  const insert = (at: number) =>
    update((g) => {
      const instances = [...g.instances];
      instances.splice(at, 0, { id: uuid(), variantSelections: [] });
      return { ...g, instances };
    });
  const moveToInsertionPoint = (activeId: string, insertionIndex: number) =>
    update((g) => {
      const from = g.instances.findIndex((instance) => instance.id === activeId);
      if (from < 0) return g;
      const instances = [...g.instances];
      const [instance] = instances.splice(from, 1);
      let to = Math.max(0, Math.min(insertionIndex, g.instances.length));
      if (from < to) to -= 1;
      instances.splice(to, 0, instance);
      return { ...g, instances };
    });
  const setPreset = (instanceId: string, presetId?: string) =>
    update((g) => ({
      ...g,
      instances: g.instances.map((instance) => {
        if (instance.id !== instanceId) return instance;
        if (!presetId) return { id: instance.id, variantSelections: [] };
        const resolved = findPreset(data, presetId);
        if (!resolved) return instance;
        return {
          id: instance.id,
          conceptId: resolved.concept.id,
          presetId: resolved.preset.id,
          variantSelections: resolved.preset.variantSelections.map((selection) => ({
            ...selection,
          })),
        };
      }),
    }));
  const setVariant = (
    instanceId: string,
    groupId: string,
    variantId?: string,
  ) =>
    update((g) => ({
      ...g,
      instances: g.instances.map((instance) => {
        if (instance.id !== instanceId) return instance;
        const variantSelections = instance.variantSelections.filter(
          (selection) => selection.groupId !== groupId,
        );
        if (variantId) variantSelections.push({ groupId, variantId });
        return { ...instance, variantSelections };
      }),
    }));
  const collisionDetection: CollisionDetection = (args) => {
    if (args.active.data.current?.type === "new-instance") {
      return pointerWithin({
        ...args,
        droppableContainers: args.droppableContainers.filter(
          (container) => container.data.current?.type === "insert",
        ),
      });
    }
    return closestCenter(args);
  };
  const clearDrag = () => {
    setActiveDragKind(null);
    setActiveDragId(null);
  };
  const dragStart = (event: DragStartEvent) => {
    const kind =
      event.active.data.current?.type === "new-instance"
        ? "new-instance"
        : "instance";
    setActiveDragKind(kind);
    setActiveDragId(kind === "instance" ? String(event.active.id) : null);
  };
  const drag = (event: DragEndEvent) => {
    clearDrag();
    if (!event.over) return;

    const kind = event.active.data.current?.type as DragKind | undefined;
    const overType = event.over.data.current?.type;
    const activeId = String(event.active.id);

    if (kind === "new-instance") {
      if (overType === "insert") {
        insert(Number(event.over.data.current?.index));
      }
      return;
    }

    if (kind !== "instance") return;
    if (event.over.id === DELETE_INSTANCE_DROP_ID) {
      update((g) => ({
        ...g,
        instances: g.instances.filter((instance) => instance.id !== activeId),
      }));
      return;
    }
    if (overType === "insert") {
      moveToInsertionPoint(activeId, Number(event.over.data.current?.index));
      return;
    }
    if (event.active.id === event.over.id) return;

    const from = generator.instances.findIndex(
      (instance) => instance.id === activeId,
    );
    const to = generator.instances.findIndex(
      (instance) => instance.id === String(event.over!.id),
    );
    if (from >= 0 && to >= 0)
      update((g) => ({ ...g, instances: arrayMove(g.instances, from, to) }));
  };
  const out = evaluatePrompt(generator, data);
  const activeInstance = activeDragId
    ? generator.instances.find((instance) => instance.id === activeDragId)
    : undefined;
  const formTransformStyle = formTransform
    ? `translate3d(${formTransform.x}px, ${formTransform.y}px, 0)`
    : undefined;

  return (
    <Card
      ref={setFormNodeRef}
      compact
      className="prompt-generator-card"
      style={{
        transform: formTransformStyle,
        transition: formTransition,
        position: "relative",
        zIndex: isFormDragging ? 1 : undefined,
      }}
    >
      <header className="prompt-generator-header">
        <span className="prompt-generator-title">#{index + 1}</span>
        <Popover
          content={
            <Menu>
              <MenuItem
                icon="trash"
                intent="danger"
                text="削除する"
                onClick={onDelete}
              />
            </Menu>
          }
          placement="bottom-end"
        >
          <Button
            icon="more"
            variant="minimal"
            size="small"
            aria-label="プロンプト生成の操作"
          />
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
          <SortableContext
            items={generator.instances.map((instance) => instance.id)}
            strategy={verticalListSortingStrategy}
          >
            <InstanceInsertTarget
              index={0}
              onClick={() => insert(0)}
              newInstanceDragging={activeDragKind === "new-instance"}
            />
            {generator.instances.map((instance, instanceIndex) => (
              <Fragment key={instance.id}>
                <SortableInstance
                  instance={instance}
                  data={data}
                  onPresetChange={(presetId) =>
                    setPreset(instance.id, presetId)
                  }
                  onVariantChange={(groupId, variantId) =>
                    setVariant(instance.id, groupId, variantId)
                  }
                />
                <InstanceInsertTarget
                  index={instanceIndex + 1}
                  onClick={() => insert(instanceIndex + 1)}
                  newInstanceDragging={activeDragKind === "new-instance"}
                />
              </Fragment>
            ))}
          </SortableContext>
          <AddInstanceButton onClick={() => insert(generator.instances.length)} />
          {activeDragKind === "instance" && <DeleteInstanceDropZone />}
          <DragOverlay dropAnimation={null}>
            {activeDragKind === "new-instance" ? (
              <AddInstanceDragOverlay />
            ) : activeDragKind === "instance" && activeInstance ? (
              <ExistingInstanceDragOverlay
                instance={activeInstance}
                data={data}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </section>
      <section className="prompt-section">
        <h3>生成されたプロンプト</h3>
        <ResultText text={out.prompt} />
      </section>
      <section className="prompt-section">
        <h3>生成されたネガティブプロンプト</h3>
        <ResultText text={out.negativePrompt} />
      </section>
      <footer className="prompt-generator-actions">
        <Tooltip content="左側に複製する">
          <Button
            icon="add-column-left"
            variant="minimal"
            size="small"
            aria-label="左側に複製"
            onClick={() => onClone(index, index)}
          />
        </Tooltip>
        <span
          ref={setFormDragHandleRef}
          className="flex-spacer"
          {...formDragAttributes}
          {...formDragListeners}
          aria-label="プロンプト生成フォームを移動"
          style={{
            alignSelf: "stretch",
            cursor: isFormDragging ? "grabbing" : "grab",
            touchAction: "none",
          }}
        />
        <Tooltip content="右側に複製する">
          <Button
            icon="add-column-right"
            variant="minimal"
            size="small"
            aria-label="右側に複製"
            onClick={() => onClone(index, index + 1)}
          />
        </Tooltip>
      </footer>
    </Card>
  );
}
