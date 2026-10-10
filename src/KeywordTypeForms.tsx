import { Button, Card, FormGroup, InputGroup, Tooltip } from "@blueprintjs/core";
import { KeywordType } from "./data";
import ColorInput from "./ColorInput";
import { v4 as uuidv4 } from "uuid";
import { useKeywordTypesDispatch, useKeywordTypesStore } from "./contexts/keywordTypesContext";
import React from "react";

function KeywordTypeForm({ index }: { index: number }) {
  const keywordTypes = useKeywordTypesStore();
  const keyword = keywordTypes[index];
  const dispatch = useKeywordTypesDispatch();
  if (!keyword) return null;
  return <Card compact className="keyword-type-card">
    <div className="keyword-type-row">
      <FormGroup label="キーワードのタイプの名前" className="form-field-grow-2"><InputGroup value={keyword.name} onChange={(event) => dispatch({ type: "UPDATE_KEYWORD_TYPE", index, payload: { ...keyword, name: event.target.value } })} /></FormGroup>
      <ColorInput label="キーワードのタイプの色" value={keyword.color} onChange={(color) => dispatch({ type: "UPDATE_KEYWORD_TYPE", index, payload: { ...keyword, color } })} />
      <ColorInput label="キーワードのタイプの背景色" value={keyword.backgroundColor} onChange={(backgroundColor) => dispatch({ type: "UPDATE_KEYWORD_TYPE", index, payload: { ...keyword, backgroundColor } })} />
    </div>
    <div className="keyword-type-actions">
      <Tooltip content="上へ"><Button icon="arrow-up" variant="minimal" size="small" aria-label="move up" disabled={index === 0} onClick={() => { if (index === 0) return; dispatch({ type: "MOVE_KEYWORD_TYPE", fromIndex: index, toIndex: index - 1 }); }} /></Tooltip>
      <Tooltip content="下へ"><Button icon="arrow-down" variant="minimal" size="small" aria-label="move down" disabled={index === keywordTypes.length - 1} onClick={() => { if (index === keywordTypes.length - 1) return; dispatch({ type: "MOVE_KEYWORD_TYPE", fromIndex: index, toIndex: index + 1 }); }} /></Tooltip>
      <span className="flex-spacer" />
      <Button icon="trash" variant="minimal" size="small" intent="danger" aria-label="delete" onClick={() => dispatch({ type: "REMOVE_KEYWORD_TYPE", index })} />
    </div>
  </Card>;
}

export default function KeywordTypeForms() {
  const keywordTypes = useKeywordTypesStore();
  const dispatch = useKeywordTypesDispatch();
  return <div className="keyword-type-forms-list">{keywordTypes.map((keywordType, index) => <React.Fragment key={keywordType.id}>
    <KeywordTypeForm index={index} />
    <Button variant="outlined" icon="add" size="small" className="add-form-button" onClick={() => {
      const newKeywordType: KeywordType = { id: uuidv4(), name: "", color: "", backgroundColor: "" };
      dispatch({ type: "ADD_KEYWORD_TYPE", index: index + 1, payload: newKeywordType });
    }}>キーワードタイプを追加</Button>
  </React.Fragment>)}</div>;
}
