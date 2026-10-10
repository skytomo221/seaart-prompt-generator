import { Button } from "@blueprintjs/core";
import KeywordSelect from "./KeywordSelect";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SelectedKeywordName } from "./selectedKeywordName";

export default function SortableKeyword({ selectedKeywordName }: { selectedKeywordName: SelectedKeywordName }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: `${selectedKeywordName.id}` });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return <div ref={setNodeRef} style={style} {...attributes} className="sortable-keyword">
    <Button {...listeners} icon="drag-handle-vertical" variant="minimal" size="small" aria-label="drag" className="keyword-drag-handle" />
    <KeywordSelect selectedKeywordName={selectedKeywordName} />
  </div>;
}
