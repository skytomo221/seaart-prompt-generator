import { Button } from "@blueprintjs/core";
import { closestCenter, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, horizontalListSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "framer-motion";
import { v4 as uuid } from "uuid";
import { Data, PromptGenerator } from "./data";
import PromptGeneratorForm from "./PromptGeneratorForm";
import { ResultCopyStatusProvider } from "./ResultText";

export default function PromptGeneratorsTab({ data, generators, onChange }: { data: Data; generators: PromptGenerator[]; onChange: (generators: PromptGenerator[]) => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const add = () => onChange([...generators, { id: uuid(), presetSlots: [] }]);
  const clone = (source: number, at: number) => {
    const original = generators[source];
    if (!original) return;
    const copy = { id: uuid(), presetSlots: original.presetSlots.map(s => ({ ...s, id: uuid() })) };
    onChange([...generators.slice(0, at), copy, ...generators.slice(at)]);
  };
  const change = (g: PromptGenerator) => onChange(generators.map(x => x.id === g.id ? g : x));
  const remove = (id: string) => onChange(generators.filter(x => x.id !== id));
  const reorder = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = generators.findIndex(g => g.id === String(e.active.id));
    const to = generators.findIndex(g => g.id === String(e.over!.id));
    if (from >= 0 && to >= 0) onChange(arrayMove(generators, from, to));
  };

  return <ResultCopyStatusProvider>
    <div className="prompt-generators-tab">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorder}>
        <SortableContext items={generators.map(g => g.id)} strategy={horizontalListSortingStrategy}>
          <AnimatePresence initial={false}>
            {generators.map((g, i) => <motion.div key={g.id}>
              <PromptGeneratorForm generator={g} index={i} data={data} onChange={change} onClone={clone} onDelete={() => remove(g.id)} />
            </motion.div>)}
          </AnimatePresence>
        </SortableContext>
        <Button icon="add" variant="outlined" onClick={add}>生成フォーム追加</Button>
      </DndContext>
    </div>
  </ResultCopyStatusProvider>;
}
