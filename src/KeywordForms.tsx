import { Button, Card, FormGroup, InputGroup, TextArea, Tooltip } from "@blueprintjs/core";
import { Keyword } from "./data";
import { v4 as uuidv4 } from "uuid";
import { useKeywordsDispatch, useKeywordsStore } from "./contexts/keywordsContext";
import React from "react";

type KeywordFormProps = { index: number; };

function KeywordForm({ index }: KeywordFormProps) {
  const keywords = useKeywordsStore();
  const keyword = keywords[index];
  const keywordsDispatch = useKeywordsDispatch();
  if (!keyword) return null;
  const { name, type, prompt, negativePrompt } = keyword;
  return <Card compact className="keyword-form-card">
    <div className="keyword-form-row">
      <FormGroup label="キーワードの名前" className="form-field-grow-2"><InputGroup value={name} onChange={(e) => keywordsDispatch({ type: "UPDATE_KEYWORD", index, payload: { ...keyword, name: e.target.value } })} /></FormGroup>
      <FormGroup label="キーワードの種類" className="form-field-grow-1"><InputGroup value={type} onChange={(e) => keywordsDispatch({ type: "UPDATE_KEYWORD", index, payload: { ...keyword, type: e.target.value } })} /></FormGroup>
    </div>
    <FormGroup label="キーワードのプロンプト">
      <TextArea className="keyword-form-monospace" fill value={prompt} onChange={(e) => keywordsDispatch({ type: "UPDATE_KEYWORD", index, payload: { ...keyword, prompt: e.target.value } })} />
    </FormGroup>
    <FormGroup label="キーワードのネガティブプロンプト">
      <TextArea className="keyword-form-monospace" fill value={negativePrompt ?? ""} onChange={(e) => keywordsDispatch({ type: "UPDATE_KEYWORD", index, payload: { ...keyword, negativePrompt: e.target.value } })} />
    </FormGroup>
    <div className="keyword-form-actions">
      <Tooltip content="上へ"><Button icon="arrow-up" variant="minimal" size="small" aria-label="move up" disabled={index === 0} onClick={() => { if (index === 0) return; keywordsDispatch({ type: "MOVE_KEYWORD", fromIndex: index, toIndex: index - 1 }); }} /></Tooltip>
      <Tooltip content="下へ"><Button icon="arrow-down" variant="minimal" size="small" aria-label="move down" disabled={index === keywords.length - 1} onClick={() => { if (index === keywords.length - 1) return; keywordsDispatch({ type: "MOVE_KEYWORD", fromIndex: index, toIndex: index + 1 }); }} /></Tooltip>
      <span className="flex-spacer" />
      <Button icon="trash" variant="minimal" size="small" intent="danger" aria-label="delete" onClick={() => keywordsDispatch({ type: "REMOVE_KEYWORD", index })} />
    </div>
  </Card>;
}

function KeywordForms() {
  const keywords = useKeywordsStore();
  const keywordsDispatch = useKeywordsDispatch();
  return <div className="keyword-forms-list">{keywords.map((keyword, index) => <React.Fragment key={keyword.id}>
    <KeywordForm index={index} />
    <Button variant="outlined" icon="add" size="small" className="add-form-button" onClick={() => {
      const newKeyword: Keyword = { id: uuidv4(), name: "", type: "", prompt: "" };
      keywordsDispatch({ type: "ADD_KEYWORD", index: index + 1, payload: newKeyword });
    }}>キーワードを追加</Button>
  </React.Fragment>)}</div>;
}

export default KeywordForms;
