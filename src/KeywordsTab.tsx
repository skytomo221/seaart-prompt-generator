import { MutableRefObject } from "react";
import KeywordEditor from "./KeywordEditor";
import KeywordList from "./KeywordList";

type Props = {
  selectedKeywordId: string | null;
  onSelectedKeywordIdChange: (id: string | null) => void;
  listScrollTopRef: MutableRefObject<number>;
  editorScrollTopRef: MutableRefObject<number>;
};

export default function KeywordsTab({ selectedKeywordId, onSelectedKeywordIdChange, listScrollTopRef, editorScrollTopRef }: Props) {
  return <div className="tab-content editor-tab-content">
    <KeywordList selectedId={selectedKeywordId} onSelect={onSelectedKeywordIdChange} scrollTopRef={listScrollTopRef} />
    <KeywordEditor selectedId={selectedKeywordId} onSelectedIdChange={onSelectedKeywordIdChange} scrollTopRef={editorScrollTopRef} />
  </div>;
}
