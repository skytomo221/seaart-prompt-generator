import { Button } from "@blueprintjs/core";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { memo, MutableRefObject, useLayoutEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { KeywordType } from "./data";
import InsertButton from "./InsertButton";
import { useKeywordTypesDispatch, useKeywordTypesStore } from "./contexts/keywordTypesContext";

type Props = { selectedId: string | null; onSelect: (id: string) => void; scrollTopRef: MutableRefObject<number> };

const SortableKeywordTypeListItem = memo(function SortableKeywordTypeListItem({
  item, selected, onSelect,
}: { item: KeywordType; selected: boolean; onSelect: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`editor-list-row${selected ? " is-selected" : ""}${isDragging ? " is-dragging" : ""}`}>
    <Button {...attributes} {...listeners} icon="drag-handle-vertical" variant="minimal" size="small" aria-label={`${item.name || "名称未設定"}を並べ替え`} className="editor-list-drag-handle" />
    <button type="button" className="editor-list-select" aria-current={selected ? "true" : undefined} onClick={() => onSelect(item.id)}>{item.name || "名称未設定"}</button>
  </div>;
});

export default function KeywordTypeList({ selectedId, onSelect, scrollTopRef }: Props) {
  const listRef = useRef<HTMLElement>(null);
  const keywordTypes = useKeywordTypesStore();
  const dispatch = useKeywordTypesDispatch();
  const sensors = useSensors(useSensor(PointerSensor));
  const move = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = keywordTypes.findIndex((item) => item.id === active.id);
    const toIndex = keywordTypes.findIndex((item) => item.id === over.id);
    if (fromIndex < 0 || toIndex < 0) return;
    const moved = arrayMove(keywordTypes, fromIndex, toIndex);
    dispatch({ type: "MOVE_KEYWORD_TYPE", fromIndex, toIndex: moved.findIndex((item) => item.id === String(active.id)) });
  };
  const insertAt = (index: number) => {
    const item: KeywordType = { id: uuidv4(), name: "", color: "", backgroundColor: "" };
    dispatch({ type: "ADD_KEYWORD_TYPE", index, payload: item });
    onSelect(item.id);
  };

  useLayoutEffect(() => {
    if (listRef.current) listRef.current.scrollTop = scrollTopRef.current;
  }, [scrollTopRef]);

  return <aside ref={listRef} className="editor-list-pane" aria-label="キーワードタイプ一覧" onScroll={(event) => { scrollTopRef.current = event.currentTarget.scrollTop; }}>
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={move}>
      <SortableContext items={keywordTypes.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className="editor-list-items">
          {keywordTypes.map((item, index) => <div key={item.id}>
            <SortableKeywordTypeListItem item={item} selected={item.id === selectedId} onSelect={onSelect} />
            {index < keywordTypes.length - 1 && <InsertButton ariaLabel="キーワードタイプを間に挿入" onClick={() => insertAt(index + 1)} />}
          </div>)}
        </div>
      </SortableContext>
    </DndContext>
    <Button variant="outlined" icon="add" size="small" fill onClick={() => insertAt(keywordTypes.length)}>キーワードタイプを追加</Button>
  </aside>;
}
