import { Intent, MenuItem } from "@blueprintjs/core";
import { Suggest, type ItemRenderer } from "@blueprintjs/select";
import { useKeywordsStore } from './contexts/keywordsContext';
import { usePromptGeneratorsStore, usePromptGeneratorsDispatch } from './contexts/promptGeneratorsContext';
import { SelectedKeywordName } from './selectedKeywordName';
import { useKeywordTypesStore } from './contexts/keywordTypesContext';

const defaultKeywordName = "空白";

export default function KeywordSelect({ selectedKeywordName }: { selectedKeywordName: SelectedKeywordName }) {
  const keywords = useKeywordsStore();
  const keywordTypes = useKeywordTypesStore();
  const promptGenerators = usePromptGeneratorsStore();
  const dispatch = usePromptGeneratorsDispatch();

  function getKeyword(keywordName: string) { return keywords.find((keyword) => keyword.name === keywordName); }
  function getBackgroundColor(keywordName: string) {
    const type = getKeyword(keywordName)?.type;
    return keywordTypes.find((keywordType) => keywordType.name === type)?.backgroundColor || undefined;
  }
  function getColor(keywordName: string) {
    const type = getKeyword(keywordName)?.type;
    return keywordTypes.find((keywordType) => keywordType.name === type)?.color || undefined;
  }
  const index = promptGenerators.findIndex((pg) => pg.selectedKeywordNames.some((k) => k.id === selectedKeywordName.id));
  const keywordName = promptGenerators[index]?.selectedKeywordNames.find((k) => k.id === selectedKeywordName.id)?.name || defaultKeywordName;

  const handleKeywordNameChange = (newKeywordName: string | null) => {
    if (!promptGenerators[index]) return;
    if (newKeywordName === "削除する") {
      const updated = promptGenerators[index].selectedKeywordNames.filter((item) => item.id !== selectedKeywordName.id);
      dispatch({ type: "UPDATE_PROMPT_GENERATOR", index, payload: { ...promptGenerators[index], selectedKeywordNames: updated } });
      return;
    }
    const updated = promptGenerators[index].selectedKeywordNames.map((item) => item.id === selectedKeywordName.id ? { ...item, name: newKeywordName ?? defaultKeywordName } : item);
    dispatch({ type: "UPDATE_PROMPT_GENERATOR", index, payload: { ...promptGenerators[index], selectedKeywordNames: updated } });
  };

  const items = ["削除する", "空白", ...keywords.map((keyword) => keyword.name)].filter((item, index, all) => item !== "" && all.indexOf(item) === index);
  const itemRenderer: ItemRenderer<string> = (item, { modifiers, handleClick, ref }) => {
    if (!modifiers.matchesPredicate) return null;
    if (item === "削除する") return <MenuItem ref={ref} text={item} icon="trash" intent={Intent.DANGER} active={modifiers.active} disabled={modifiers.disabled} onClick={handleClick} roleStructure="listoption" />;
    if (item === "空白") return <MenuItem ref={ref} text="␠ 空白" active={modifiers.active} disabled={modifiers.disabled} onClick={handleClick} roleStructure="listoption" />;
    return <MenuItem ref={ref} text={item} active={modifiers.active} disabled={modifiers.disabled} onClick={handleClick} roleStructure="listoption" style={{ color: getColor(item), backgroundColor: getBackgroundColor(item) }} />;
  };

  return <Suggest<string>
    items={items}
    selectedItem={keywordName}
    inputValueRenderer={(item) => item}
    itemPredicate={(query, item) => item.toLocaleLowerCase().includes(query.toLocaleLowerCase())}
    itemRenderer={itemRenderer}
    onItemSelect={handleKeywordNameChange}
    onQueryChange={() => undefined}
    fill
    noResults={<MenuItem disabled text="該当する項目がありません" roleStructure="listoption" />}
    resetOnClose
    inputProps={{ style: { color: getColor(keywordName), backgroundColor: getBackgroundColor(keywordName) } }}
    className="keyword-suggest"
  />;
}
