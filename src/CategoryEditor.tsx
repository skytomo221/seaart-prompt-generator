import { Button, FormGroup, InputGroup } from "@blueprintjs/core";
import { Category, Data } from "./data";
import AttributeMultiSelect from "./AttributeMultiSelect";
import ColorInput from "./ColorInput";

export default function CategoryEditor({ category, data, onChange, onDelete }: { category: Category; data: Data; onChange: (c: Category) => void; onDelete: () => void }) {
  const patch = (p: Partial<Category>) => onChange({ ...category, ...p });
  const concepts = data.concepts.filter(concept => concept.categoryId === category.id);
  return <div className="detail-form">
    <FormGroup label="名前"><InputGroup value={category.name} onChange={e => patch({ name: e.currentTarget.value })} /></FormGroup>
    <FormGroup label="属性"><AttributeMultiSelect attributes={data.attributes} selectedIds={category.attributeIds} onChange={attributeIds => patch({ attributeIds })} /></FormGroup>
    <div className="inline-fields"><ColorInput label="背景色" value={category.backgroundColor} onChange={backgroundColor => patch({ backgroundColor })} /><ColorInput label="文字色" value={category.color} onChange={color => patch({ color })} /></div>
    <section className="reference-section"><h3>このカテゴリに属するコンセプト</h3>{concepts.length ? <ul>{concepts.map(concept => <li key={concept.id}>{concept.name}</li>)}</ul> : <p>このカテゴリに属するコンセプトはありません。</p>}</section>
    <Button intent="danger" onClick={onDelete}>カテゴリを削除</Button>
  </div>;
}
