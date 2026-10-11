import { Button } from "@blueprintjs/core";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MutableRefObject, memo, useLayoutEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { Keyword } from "./data";
import InsertButton from "./InsertButton";
import { useKeywordsDispatch, useKeywordsStore } from "./contexts/keywordsContext";

type Props = {
  selectedId: string | null;
  onSelect: (id: string) => void;
  scrollTopRef: MutableRefObject<number>;
};

const SortableKeywordListItem = memo(function SortableKeywordListItem({
  item, selected, onSelect,
}: { item: Keyword; selected: boolean; onSelect: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`editor-list-row${selected ? " is-selected" : ""}${isDragging ? " is-dragging" : ""}`}>
    <Button {...attributes} {...listeners} icon="drag-handle-vertical" variant="minimal" size="small" aria-label={`${item.name || "名称未設定"}を並べ替え`} className="editor-list-drag-handle" />
    <button type="button" className="editor-list-select" aria-current={selected ? "true" : undefined} onClick={() => onSelect(item.id)}>{item.name || "名称未設定"}</button>
  </div>;
});

export default function KeywordList({ selectedId, onSelect, scrollTopRef }: Props) {
  const listRef = useRef<HTMLElement>(null);
  const keywords = useKeywordsStore();
  const dispatch = useKeywordsDispatch();
  const sensors = useSensors(useSensor(PointerSensor));

  const move = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = keywords.findIndex((item) => item.id === active.id);
    const toIndex = keywords.findIndex((item) => item.id === over.id);
    if (fromIndex < 0 || toIndex < 0) return;
    const moved = arrayMove(keywords, fromIndex, toIndex);
    const newIndex = moved.findIndex((item) => item.id === String(active.id));
    dispatch({ type: "MOVE_KEYWORD", fromIndex, toIndex: newIndex });
  };

  const insertAt = (index: number) => {
    const keyword: Keyword = { id: uuidv4(), name: "", type: "", prompt: "" };
    dispatch({ type: "ADD_KEYWORD", index, payload: keyword });
    onSelect(keyword.id);
  };

  useLayoutEffect(() => {
    if (listRef.current) listRef.current.scrollTop = scrollTopRef.current;
  }, [scrollTopRef]);

  return <aside ref={listRef} className="editor-list-pane" aria-label="キーワード一覧" onScroll={(event) => { scrollTopRef.current = event.currentTarget.scrollTop; }}>
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={move}>
      <SortableContext items={keywords.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className="editor-list-items">
          {keywords.map((item, index) => <div key={item.id}>
            <SortableKeywordListItem item={item} selected={item.id === selectedId} onSelect={onSelect} />
            {index < keywords.length - 1 && <InsertButton ariaLabel="キーワードを間に挿入" onClick={() => insertAt(index + 1)} />}
          </div>)}
        </div>
      </SortableContext>
    </DndContext>
    <Button variant="outlined" icon="add" size="small" fill onClick={() => insertAt(keywords.length)}>キーワードを追加</Button>
  </aside>;
}
