import { Button } from "@blueprintjs/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Data, PresetSlot } from "./data";
import PresetSelect from "./PresetSelect";

export default function SortablePreset({ slot, data, onChange }: { slot: PresetSlot; data: Data; onChange: (id?: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slot.id,
    data: { type: "instance" },
  });

  return <div
    ref={setNodeRef}
    style={{
      transform: isDragging ? undefined : CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.3 : 1,
    }}
    {...attributes}
    className="sortable-preset"
  >
    <Button {...listeners} icon="drag-handle-vertical" variant="minimal" size="small" aria-label="ドラッグして並べ替え" className="preset-drag-handle" />
    <PresetSelect slot={slot} data={data} onChange={onChange} />
  </div>;
}
