import { useRef } from "react";
import { v4 as uuid } from "uuid";
import { Concept, Data, PromptGeneratorsData } from "./data";
import ConceptList from "./ConceptList";
import ConceptEditor from "./ConceptEditor";
import { getDeletionReferences } from "./domain/references";

export default function ConceptsTab({ data, onChange, generators, selectedId, onSelect, onError }: {
  data: Data;
  onChange: (d: Data) => void;
  generators: PromptGeneratorsData;
  selectedId: string;
  onSelect: (id: string) => void;
  onError: (message: string) => void;
}) {
  const scroll = useRef(0);
  const add = (at: number) => {
    const concept: Concept = {
      id: uuid(),
      name: "新しいコンセプト",
      categoryId: data.categories[0]?.id ?? "",
      attributeIds: [],
      variantGroups: [],
      presets: [{ id: uuid(), name: "", variantSelections: [] }],
      promptFragments: { root: [], definitions: [] },
      negativePromptFragments: { root: [], definitions: [] },
    };
    onChange({ ...data, concepts: [...data.concepts.slice(0, at), concept, ...data.concepts.slice(at)] });
    onSelect(concept.id);
  };
  const update = (concept: Concept) => onChange({ ...data, concepts: data.concepts.map(item => item.id === concept.id ? concept : item) });
  const remove = (kind: "concept" | "preset" | "variantGroup" | "variant", id: string) => {
    const concept = data.concepts.find(item => item.id === selectedId);
    const refs = getDeletionReferences(kind, id, data, generators, concept);
    if (refs.length) { onError(`削除できません。参照元:\n${refs.join("\n")}`); return; }
    onError("");
    if (kind === "concept") {
      onChange({ ...data, concepts: data.concepts.filter(item => item.id !== id) });
      onSelect("");
    } else if (kind === "preset") onChange({ ...data, concepts: data.concepts.map(item => ({ ...item, presets: item.presets.filter(preset => preset.id !== id) })) });
    else if (kind === "variantGroup") onChange({ ...data, concepts: data.concepts.map(item => ({ ...item, variantGroups: item.variantGroups.filter(group => group.id !== id) })) });
    else onChange({ ...data, concepts: data.concepts.map(item => ({ ...item, variantGroups: item.variantGroups.map(group => ({ ...group, variants: group.variants.filter(variant => variant.id !== id) })) })) });
  };
  const selected = data.concepts.find(concept => concept.id === selectedId);
  return <div className="tab-content editor-tab-content">
    <ConceptList items={data.concepts} selectedId={selectedId} onSelect={onSelect} onAdd={add} scrollTopRef={scroll} onReorder={items => onChange({ ...data, concepts: items.map(item => data.concepts.find(concept => concept.id === item.id)!) })} />
    <div className="editor-detail-pane">{selected ? <ConceptEditor concept={selected} data={data} onChange={update} onDelete={() => remove("concept", selected.id)} onDeletePreset={id => remove("preset", id)} onDeleteGroup={id => remove("variantGroup", id)} onDeleteVariant={id => remove("variant", id)} /> : <div className="editor-empty-state">コンセプトを選択してください</div>}</div>
  </div>;
}
