import { Button, Card, FormGroup, InputGroup, TextArea } from "@blueprintjs/core";
import { MutableRefObject, useLayoutEffect, useRef } from "react";
import { useKeywordsDispatch, useKeywordsStore } from "./contexts/keywordsContext";

type Props = { selectedId: string | null; onSelectedIdChange: (id: string | null) => void; scrollTopRef: MutableRefObject<number> };

export default function KeywordEditor({ selectedId, onSelectedIdChange, scrollTopRef }: Props) {
  const editorRef = useRef<HTMLElement>(null);
  const keywords = useKeywordsStore();
  const dispatch = useKeywordsDispatch();
  const index = selectedId ? keywords.findIndex((item) => item.id === selectedId) : -1;
  const keyword = index >= 0 ? keywords[index] : undefined;

  const update = (values: Partial<NonNullable<typeof keyword>>) => {
    if (!keyword) return;
    dispatch({ type: "UPDATE_KEYWORD", index, payload: { ...keyword, ...values } });
  };
  const remove = () => {
    if (!keyword) return;
    const nextSelection = keywords[index + 1]?.id ?? keywords[index - 1]?.id ?? null;
    dispatch({ type: "REMOVE_KEYWORD", index });
    onSelectedIdChange(nextSelection);
  };

  useLayoutEffect(() => {
    if (editorRef.current) editorRef.current.scrollTop = scrollTopRef.current;
  }, [scrollTopRef]);

  return <section ref={editorRef} className="editor-detail-pane" aria-label="キーワード編集" onScroll={(event) => { scrollTopRef.current = event.currentTarget.scrollTop; }}>
    {keyword ? <Card compact className="keyword-editor-card">
      <FormGroup label="キーワードの名前"><InputGroup value={keyword.name} onChange={(event) => update({ name: event.target.value })} /></FormGroup>
      <FormGroup label="キーワードの種類"><InputGroup value={keyword.type} onChange={(event) => update({ type: event.target.value })} /></FormGroup>
      <FormGroup label="キーワードのプロンプト"><TextArea className="keyword-form-monospace" fill value={keyword.prompt} onChange={(event) => update({ prompt: event.target.value })} /></FormGroup>
      <FormGroup label="キーワードのネガティブプロンプト"><TextArea className="keyword-form-monospace" fill value={keyword.negativePrompt ?? ""} onChange={(event) => update({ negativePrompt: event.target.value })} /></FormGroup>
      <div className="keyword-form-actions"><span className="flex-spacer" /><Button icon="trash" variant="minimal" size="small" intent="danger" aria-label="キーワードを削除" onClick={remove}>削除</Button></div>
    </Card> : <div className="editor-empty-state">編集するキーワードを選択してください</div>}
  </section>;
}
