import { MutableRefObject } from "react";
import KeywordTypeEditor from "./KeywordTypeEditor";
import KeywordTypeList from "./KeywordTypeList";

type Props = {
  selectedKeywordTypeId: string | null;
  onSelectedKeywordTypeIdChange: (id: string | null) => void;
  listScrollTopRef: MutableRefObject<number>;
  editorScrollTopRef: MutableRefObject<number>;
};

export default function KeywordTypesTab({ selectedKeywordTypeId, onSelectedKeywordTypeIdChange, listScrollTopRef, editorScrollTopRef }: Props) {
  return <div className="tab-content editor-tab-content">
    <KeywordTypeList selectedId={selectedKeywordTypeId} onSelect={onSelectedKeywordTypeIdChange} scrollTopRef={listScrollTopRef} />
    <KeywordTypeEditor selectedId={selectedKeywordTypeId} onSelectedIdChange={onSelectedKeywordTypeIdChange} scrollTopRef={editorScrollTopRef} />
  </div>;
}
