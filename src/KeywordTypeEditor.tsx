import { Button, Card, FormGroup, InputGroup } from "@blueprintjs/core";
import { MutableRefObject, useLayoutEffect, useRef } from "react";
import ColorInput from "./ColorInput";
import { useKeywordTypesDispatch, useKeywordTypesStore } from "./contexts/keywordTypesContext";

type Props = { selectedId: string | null; onSelectedIdChange: (id: string | null) => void; scrollTopRef: MutableRefObject<number> };

export default function KeywordTypeEditor({ selectedId, onSelectedIdChange, scrollTopRef }: Props) {
  const editorRef = useRef<HTMLElement>(null);
  const keywordTypes = useKeywordTypesStore();
  const dispatch = useKeywordTypesDispatch();
  const index = selectedId ? keywordTypes.findIndex((item) => item.id === selectedId) : -1;
  const keywordType = index >= 0 ? keywordTypes[index] : undefined;
  const update = (values: Partial<NonNullable<typeof keywordType>>) => {
    if (!keywordType) return;
    dispatch({ type: "UPDATE_KEYWORD_TYPE", index, payload: { ...keywordType, ...values } });
  };
  const remove = () => {
    if (!keywordType) return;
    const nextSelection = keywordTypes[index + 1]?.id ?? keywordTypes[index - 1]?.id ?? null;
    dispatch({ type: "REMOVE_KEYWORD_TYPE", index });
    onSelectedIdChange(nextSelection);
  };

  useLayoutEffect(() => {
    if (editorRef.current) editorRef.current.scrollTop = scrollTopRef.current;
  }, [scrollTopRef]);

  return <section ref={editorRef} className="editor-detail-pane" aria-label="キーワードタイプ編集" onScroll={(event) => { scrollTopRef.current = event.currentTarget.scrollTop; }}>
    {keywordType ? <Card compact className="keyword-type-editor-card">
      <FormGroup label="キーワードタイプの名前"><InputGroup value={keywordType.name} onChange={(event) => update({ name: event.target.value })} /></FormGroup>
      <ColorInput label="キーワードタイプの文字色" value={keywordType.color} onChange={(color) => update({ color })} />
      <ColorInput label="キーワードタイプの背景色" value={keywordType.backgroundColor} onChange={(backgroundColor) => update({ backgroundColor })} />
      <div className="keyword-type-actions"><span className="flex-spacer" /><Button icon="trash" variant="minimal" size="small" intent="danger" aria-label="キーワードタイプを削除" onClick={remove}>削除</Button></div>
    </Card> : <div className="editor-empty-state">編集するキーワードタイプを選択してください</div>}
  </section>;
}
