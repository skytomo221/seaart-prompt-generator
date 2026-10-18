import { useMemo } from "react";
import { useStableEvent } from "./useStableEvent";
import { createDataIndex } from "./domain/dataIndex";
import { Button } from "@blueprintjs/core";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "framer-motion";
import { v4 as uuid } from "uuid";
import { Data, PromptGenerator } from "./data";
import PromptGeneratorForm from "./PromptGeneratorForm";
import { ResultCopyStatusProvider } from "./ResultText";

export default function PromptGeneratorsTab({
  data,
  generators,
  onChange,
}: {
  data: Data;
  generators: PromptGenerator[];
  onChange: (generators: PromptGenerator[]) => void;
}) {
  const dataIndex = useMemo(() => createDataIndex(data), [data]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );
  const add = () => onChange([...generators, { id: uuid(), instances: [] }]);
  const clone = useStableEvent((source: number, at: number) => {
    const original = generators[source];
    if (!original) return;
    const copy = {
      id: uuid(),
      instances: original.instances.map((instance) => ({
        ...instance,
        id: uuid(),
        variantSelections: instance.variantSelections.map((selection) => ({
          ...selection,
        })),
      })),
    };
    onChange([...generators.slice(0, at), copy, ...generators.slice(at)]);
  });
  const change = useStableEvent((generator: PromptGenerator) =>
    onChange(
      generators.map((item) => (item.id === generator.id ? generator : item)),
    ),
  );
  const remove = useStableEvent((id: string) =>
    onChange(generators.filter((item) => item.id !== id)),
  );
  const reorder = (event: DragEndEvent) => {
    if (!event.over || event.active.id === event.over.id) return;
    const from = generators.findIndex(
      (generator) => generator.id === String(event.active.id),
    );
    const to = generators.findIndex(
      (generator) => generator.id === String(event.over!.id),
    );
    if (from >= 0 && to >= 0) onChange(arrayMove(generators, from, to));
  };

  return (
    <ResultCopyStatusProvider>
      <div className="prompt-generators-tab">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={reorder}
        >
          <SortableContext
            items={generators.map((generator) => generator.id)}
            strategy={horizontalListSortingStrategy}
          >
            <AnimatePresence initial={false}>
              {generators.map((generator, index) => (
                <motion.div key={generator.id}>
                  <PromptGeneratorForm
                    generator={generator}
                    index={index}
                    data={data}
                    dataIndex={dataIndex}
                    onChange={change}
                    onClone={clone}
                    onDelete={remove}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </SortableContext>
          <Button icon="add" variant="outlined" onClick={add}>
            生成フォーム追加
          </Button>
        </DndContext>
      </div>
    </ResultCopyStatusProvider>
  );
}
