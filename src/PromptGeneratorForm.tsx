import { Button, Card, Menu, MenuItem, Popover, Tooltip } from "@blueprintjs/core";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { v4 as uuid } from "uuid";
import { Fragment } from "react";
import { Data, PromptGenerator } from "./data";
import { evaluatePrompt } from "./domain/evaluatePrompt";
import ResultText from "./ResultText";
import InsertButton from "./InsertButton";
import SortablePreset from "./SortablePreset";

export default function PromptGeneratorForm({ generator, index, data, onChange, onClone, onDelete }: { generator: PromptGenerator; index: number; data: Data; onChange: (g: PromptGenerator) => void; onClone: (source: number, at: number) => void; onDelete: () => void }) {
  const sensors = useSensors(useSensor(PointerSensor));
  const update = (fn: (g: PromptGenerator) => PromptGenerator) => onChange(fn(generator));
  const insert = (at: number) => update(g => {
    const slots = [...g.presetSlots];
    slots.splice(at, 0, { id: uuid() });
    return { ...g, presetSlots: slots };
  });
  const drag = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const a = generator.presetSlots.findIndex(s => s.id === e.active.id);
    const b = generator.presetSlots.findIndex(s => s.id === e.over!.id);
    if (a >= 0 && b >= 0) update(g => ({ ...g, presetSlots: arrayMove(g.presetSlots, a, b) }));
  };
  const out = evaluatePrompt(generator, data);

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
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={drag}>
        <SortableContext items={generator.presetSlots.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {generator.presetSlots.map((slot, i) => <Fragment key={slot.id}>
            <InsertButton ariaLabel="プリセットを挿入" onClick={() => insert(i)} />
            <SortablePreset slot={slot} data={data} onChange={id => update(g => ({ ...g, presetSlots: g.presetSlots.map(s => s.id === slot.id ? { ...s, presetId: id } : s) }))} onDelete={() => update(g => ({ ...g, presetSlots: g.presetSlots.filter(s => s.id !== slot.id) }))} />
          </Fragment>)}
        </SortableContext>
      </DndContext>
      <Button icon="add" variant="outlined" size="small" fill onClick={() => insert(generator.presetSlots.length)}>プリセットを追加する</Button>
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
