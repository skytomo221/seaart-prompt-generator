import { Keyword } from "./data";
import { Card, Button, Tooltip } from "@blueprintjs/core";
import ResultText from "./ResultText";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { v4 as uuidv4 } from "uuid";
import { Fragment } from "react/jsx-runtime";
import { useKeywordsStore } from "./contexts/keywordsContext";
import { useDefaultCharactersStore } from "./contexts/defaultsContext";
import { usePromptGeneratorsStore, usePromptGeneratorsDispatch } from "./contexts/promptGeneratorsContext";
import { useCharacterTypeNameStore } from "./contexts/characterTypeNameContext";
import InsertButton from "./InsertButton";
import SortableKeyword from "./SortableKeyword";

interface PromptGeneratorProps { index: number; }

function PromptGeneratorForm({ index }: PromptGeneratorProps) {
  const keywords = useKeywordsStore();
  const defaultCharacters = useDefaultCharactersStore();
  const promptGenerators = usePromptGeneratorsStore();
  const promptGeneratorsDispatch = usePromptGeneratorsDispatch();
  const characterTypeName = useCharacterTypeNameStore();
  const sensors = useSensors(useSensor(PointerSensor));
  const pg = promptGenerators[index];
  if (!pg) return null;

  function addKeyword() {
    const updated = [...pg.selectedKeywordNames, { id: uuidv4(), name: "空白" }];
    promptGeneratorsDispatch({ type: "UPDATE_PROMPT_GENERATOR", index, payload: { ...pg, selectedKeywordNames: updated } });
  }
  function insertKeywordAt(idx: number) {
    const newKeyword = { id: uuidv4(), name: "空白" };
    const updated = [...pg.selectedKeywordNames.slice(0, idx), newKeyword, ...pg.selectedKeywordNames.slice(idx)];
    promptGeneratorsDispatch({ type: "UPDATE_PROMPT_GENERATOR", index, payload: { ...pg, selectedKeywordNames: updated } });
  }
  function mergeDefaults(selectedKeywords: Keyword[]): Keyword[] {
    let mergedKeywords: Keyword[] = [];
    selectedKeywords.forEach((s) => {
      mergedKeywords.push(s);
      if (s.type !== characterTypeName) return;
      const def = defaultCharacters.find((d) => d.character === s.name);
      if (!def) return;
      def.parts.forEach((part) => {
        const alreadySelected = selectedKeywords.some((sel) => sel.type === part.type);
        if (alreadySelected) return;
        const keyword: Keyword = { ...part, id: uuidv4(), name: part.type };
        if (keyword) mergedKeywords.push(keyword);
      });
    });
    return mergedKeywords;
  }
  function collectSelectedKeywords(): Keyword[] {
    const selectedKeywords = pg.selectedKeywordNames.map((selectedKeywordName) => keywords.find((k) => k.name === selectedKeywordName.name)).filter((k): k is Keyword => !!k);
    return mergeDefaults(selectedKeywords);
  }
  function getPrompts(): string { return collectSelectedKeywords().map((s) => s.prompt).join(","); }
  function getNegativePrompts(): string {
    return collectSelectedKeywords().map((s) => s.negativePrompt).filter((np): np is string => !!np && np.trim() !== "").join(",");
  }
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = pg.selectedKeywordNames.findIndex((item) => `${item.id}` === active.id);
    const newIndex = pg.selectedKeywordNames.findIndex((item) => `${item.id}` === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newArray = arrayMove(pg.selectedKeywordNames, oldIndex, newIndex);
    promptGeneratorsDispatch({ type: "UPDATE_PROMPT_GENERATOR", index, payload: { ...pg, selectedKeywordNames: newArray } });
  }
  function duplicateAt(insertIndex: number) {
    const newPromptGenerator = { id: uuidv4(), selectedKeywordNames: pg.selectedKeywordNames.map(k => ({ ...k, id: uuidv4() })) };
    promptGeneratorsDispatch({ type: "ADD_PROMPT_GENERATOR", index: insertIndex, payload: newPromptGenerator });
  }

  return <Card compact className="prompt-generator-card">
    <header className="prompt-generator-header">
      <span className="prompt-generator-title">#{index + 1}</span>
      <Tooltip content="プロンプトを削除する"><Button icon="trash" variant="minimal" size="small" intent="danger" aria-label="delete" onClick={() => promptGeneratorsDispatch({ type: "REMOVE_PROMPT_GENERATOR", index })} /></Tooltip>
    </header>
    <section className="prompt-section">
      <h3>プロンプト生成</h3>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={pg.selectedKeywordNames.map((item) => `${item.id}`)} strategy={verticalListSortingStrategy}>
          {pg.selectedKeywordNames.map((keywordName, i) => <Fragment key={keywordName.id}>
            <InsertButton onClick={() => insertKeywordAt(i)} />
            <SortableKeyword selectedKeywordName={keywordName} />
          </Fragment>)}
        </SortableContext>
      </DndContext>
      <Button id="add-keyword" icon="add" variant="outlined" size="small" fill onClick={addKeyword}>キーワードを追加する</Button>
    </section>
    <section className="prompt-section">
      <h3>生成されたプロンプト</h3><ResultText text={getPrompts()} />
    </section>
    <section className="prompt-section">
      <h3>生成されたネガティブプロンプト</h3><ResultText text={getNegativePrompts()} />
    </section>
    <footer className="prompt-generator-actions">
      <Tooltip content="左にコピーする"><Button icon="add-column-left" variant="minimal" size="small" aria-label="copy left" onClick={() => duplicateAt(index)} /></Tooltip>
      <span className="flex-spacer" />
      <Tooltip content="右にコピーする"><Button icon="add-column-right" variant="minimal" size="small" aria-label="copy right" onClick={() => duplicateAt(index + 1)} /></Tooltip>
    </footer>
  </Card>;
}

export default PromptGeneratorForm;
