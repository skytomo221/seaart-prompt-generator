import { Button, Card, FormGroup, HTMLSelect, InputGroup } from "@blueprintjs/core";
import { Concept, Data } from "./data";
import { v4 as uuid } from "uuid";
import PromptFragmentEditor from "./domain/PromptFragmentEditor";
import AttributeMultiSelect from "./AttributeMultiSelect";

interface Props {
  concept: Concept;
  data: Data;
  onChange: (c: Concept) => void;
  onDelete: () => void;
  onDeletePreset: (id: string) => void;
  onDeleteGroup: (id: string) => void;
  onDeleteVariant: (id: string) => void;
}

export default function ConceptEditor({ concept, data, onChange, onDelete, onDeletePreset, onDeleteGroup, onDeleteVariant }: Props) {
  const patch = (p: Partial<Concept>) => onChange({ ...concept, ...p });
  const setGroup = (id: string, fn: (g: Concept["variantGroups"][number]) => Concept["variantGroups"][number]) => patch({ variantGroups: concept.variantGroups.map(group => group.id === id ? fn(group) : group) });
  const selection = (preset: Concept["presets"][number], groupId: string) => preset.variantSelections.find(item => item.groupId === groupId)?.variantIds ?? [];
  const changeSelection = (presetId: string, groupId: string, variantId: string, checked: boolean) => patch({ presets: concept.presets.map(preset => {
    if (preset.id !== presetId) return preset;
    const chosen = selection(preset, groupId).filter(id => id !== variantId);
    if (checked) chosen.push(variantId);
    const selections = preset.variantSelections.filter(item => item.groupId !== groupId);
    if (chosen.length) selections.push({ groupId, variantIds: chosen });
    return { ...preset, variantSelections: selections };
  }) });

  return <div className="detail-form">
    <FormGroup label="名前"><InputGroup value={concept.name} onChange={event => patch({ name: event.currentTarget.value })} /></FormGroup>
    <FormGroup label="カテゴリ"><HTMLSelect fill value={concept.categoryId} onChange={event => patch({ categoryId: event.currentTarget.value })}><option value="">選択</option>{data.categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</HTMLSelect></FormGroup>
    <FormGroup label="属性"><AttributeMultiSelect attributes={data.attributes} selectedIds={concept.attributeIds} onChange={attributeIds => patch({ attributeIds })} /></FormGroup>

    <section><h3>バリアントグループ</h3>{concept.variantGroups.map(group => <Card key={group.id} compact className="editor-card">
      <InputGroup placeholder="バリアントグループ名" value={group.name} onChange={event => setGroup(group.id, current => ({ ...current, name: event.currentTarget.value }))} />
      <div className="inline-fields"><FormGroup label="最小選択数"><InputGroup type="number" min="0" value={String(group.minSelections)} onChange={event => setGroup(group.id, current => ({ ...current, minSelections: Number(event.currentTarget.value) }))} /></FormGroup><FormGroup label="最大選択数（空欄は無制限）"><InputGroup type="number" min="0" value={group.maxSelections === undefined ? "" : String(group.maxSelections)} onChange={event => setGroup(group.id, current => ({ ...current, maxSelections: event.currentTarget.value === "" ? undefined : Number(event.currentTarget.value) }))} /></FormGroup></div>
      {group.variants.map(variant => <div className="variant-edit" key={variant.id}>
        <FormGroup label="バリアント名"><InputGroup placeholder="新しいバリアント" value={variant.name} onChange={event => setGroup(group.id, current => ({ ...current, variants: current.variants.map(item => item.id === variant.id ? { ...item, name: event.currentTarget.value } : item) }))} /></FormGroup>
        <FormGroup label="属性"><AttributeMultiSelect attributes={data.attributes} selectedIds={variant.attributeIds} onChange={attributeIds => setGroup(group.id, current => ({ ...current, variants: current.variants.map(item => item.id === variant.id ? { ...item, attributeIds } : item) }))} /></FormGroup>
        <Button icon="cross" intent="danger" variant="minimal" aria-label="バリアントを削除" onClick={() => onDeleteVariant(variant.id)} />
      </div>)}
      <Button small icon="add" onClick={() => setGroup(group.id, current => ({ ...current, variants: [...current.variants, { id: uuid(), name: "新しいバリアント", attributeIds: [] }] }))}>バリアントを追加</Button>
      <Button small intent="danger" onClick={() => onDeleteGroup(group.id)}>バリアントグループを削除</Button>
    </Card>)}
      <Button small icon="add" onClick={() => patch({ variantGroups: [...concept.variantGroups, { id: uuid(), name: "新しいバリアントグループ", minSelections: 0, variants: [] }] })}>バリアントグループを追加</Button>
    </section>

    <section><h3>プリセット</h3>{concept.presets.map((preset, index) => <Card key={preset.id} compact className="editor-card">
      <div className="preset-edit-header"><InputGroup value={preset.name} onChange={event => patch({ presets: concept.presets.map(item => item.id === preset.id ? { ...item, name: event.currentTarget.value } : item) })} /><Button icon="arrow-up" aria-label="プリセットを上へ" disabled={!index} onClick={() => { const items = [...concept.presets]; [items[index - 1], items[index]] = [items[index], items[index - 1]]; patch({ presets: items }); }} /><Button icon="arrow-down" aria-label="プリセットを下へ" disabled={index === concept.presets.length - 1} onClick={() => { const items = [...concept.presets]; [items[index], items[index + 1]] = [items[index + 1], items[index]]; patch({ presets: items }); }} /><Button icon="trash" intent="danger" variant="minimal" aria-label="プリセットを削除" onClick={() => onDeletePreset(preset.id)} /></div>
      {concept.variantGroups.map(group => <FormGroup key={group.id} label={`${group.name}（${group.minSelections}〜${group.maxSelections ?? "無制限"}）`} className="preset-variant-group">{group.variants.map(variant => {
        const selected = selection(preset, group.id).includes(variant.id);
        const count = selection(preset, group.id).length;
        const atMax = group.maxSelections !== undefined && count >= group.maxSelections;
        return <label key={variant.id}><input type="checkbox" checked={selected} disabled={selected ? count <= group.minSelections : atMax} onChange={event => changeSelection(preset.id, group.id, variant.id, event.currentTarget.checked)} />{variant.name}</label>;
      })}</FormGroup>)}
    </Card>)}<Button small icon="add" onClick={() => patch({ presets: [...concept.presets, { id: uuid(), name: concept.name, variantSelections: [] }] })}>プリセットを追加</Button></section>

    <PromptFragmentEditor label="フラグメント" value={concept.promptFragments} concepts={data.concepts} categories={data.categories} attributes={data.attributes} onChange={promptFragments => patch({ promptFragments })} />
    <PromptFragmentEditor negative label="ネガティブフラグメント" value={concept.negativePromptFragments} concepts={data.concepts} categories={data.categories} attributes={data.attributes} onChange={negativePromptFragments => patch({ negativePromptFragments })} />
    <Button intent="danger" onClick={onDelete}>コンセプトを削除</Button>
  </div>;
}
