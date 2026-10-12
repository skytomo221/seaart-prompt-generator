import { FormGroup, InputGroup } from "@blueprintjs/core";
import { Category, Data } from "./data";
import AttributeMultiSelect from "./AttributeMultiSelect";
import ColorInput from "./ColorInput";
import EntityEditorLayout from "./EntityEditorLayout";

export default function CategoryEditor({ category, data, onChange, onDelete }: { category: Category; data: Data; onChange: (c: Category) => void; onDelete: () => void }) {
  const patch = (p: Partial<Category>) => onChange({ ...category, ...p });
  const concepts = data.concepts.filter(concept => concept.categoryId === category.id);
  const attributeNames = category.attributeIds.map(id => data.attributes.find(attribute => attribute.id === id)?.name ?? id).join("、") || "未設定";
  const references = <section className="reference-section"><h3>このカテゴリに属するコンセプト</h3>{concepts.length ? <ul>{concepts.map(concept => <li key={concept.id}>{concept.name}</li>)}</ul> : <p>このカテゴリに属するコンセプトはありません。</p>}</section>;
  const colorValue = (label: string, value: string) => <div className="detail-view-field"><div className="detail-view-label">{label}</div><div className="detail-view-color"><span className="detail-view-swatch" style={{ backgroundColor: value }} />{value || "未設定"}</div></div>;

  return <EntityEditorLayout entityId={category.id} deleteLabel="カテゴリを削除" onDelete={onDelete}
    renderView={() => <><div className="detail-view-field"><div className="detail-view-label">名前</div><div>{category.name || "未設定"}</div></div><div className="detail-view-field"><div className="detail-view-label">属性</div><div>{attributeNames}</div></div><div className="inline-fields">{colorValue("背景色", category.backgroundColor)}{colorValue("文字色", category.color)}</div>{references}</>}
    renderEdit={() => <><FormGroup label="名前"><InputGroup value={category.name} onChange={e => patch({ name: e.currentTarget.value })} /></FormGroup><FormGroup label="属性"><AttributeMultiSelect attributes={data.attributes} selectedIds={category.attributeIds} onChange={attributeIds => patch({ attributeIds })} /></FormGroup><div className="inline-fields"><ColorInput label="背景色" value={category.backgroundColor} onChange={backgroundColor => patch({ backgroundColor })} /><ColorInput label="文字色" value={category.color} onChange={color => patch({ color })} /></div>{references}</>}
  />;
}
