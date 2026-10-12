import { FormGroup, InputGroup } from "@blueprintjs/core";
import { Attribute, Data } from "./data";
import AttributeMultiSelect from "./AttributeMultiSelect";
import EntityEditorLayout from "./EntityEditorLayout";

export default function AttributeEditor({ attribute, data, onChange, onDelete }: { attribute: Attribute; data: Data; onChange: (a: Attribute) => void; onDelete: () => void }) {
  const concepts = data.concepts.filter(concept => concept.attributeIds.includes(attribute.id));
  const categories = data.categories.filter(category => category.attributeIds.includes(attribute.id));
  const variants = data.concepts.flatMap(concept => concept.variantGroups.flatMap(group => group.variants
    .filter(variant => variant.attributeIds.includes(attribute.id))
    .map(variant => `${concept.name} / ${group.name} / ${variant.name}`)));
  const impliedBy = data.attributes.filter(candidate => candidate.implies.includes(attribute.id));
  const attributeNames = (ids: string[]) => ids.map(id => data.attributes.find(item => item.id === id)?.name ?? id).join("、") || "未設定";

  const references = <>
    <section className="reference-section"><h3>この属性が設定されているコンセプト</h3>{concepts.length ? <ul>{concepts.map(concept => <li key={concept.id}>{concept.name}</li>)}</ul> : <p>該当するコンセプトはありません。</p>}</section>
    <section className="reference-section"><h3>この属性が設定されているカテゴリ</h3>{categories.length ? <ul>{categories.map(category => <li key={category.id}>{category.name}</li>)}</ul> : <p>該当するカテゴリはありません。</p>}</section>
    <section className="reference-section"><h3>この属性が設定されているバリアント</h3>{variants.length ? <ul>{variants.map((label, index) => <li key={`${label}-${index}`}>{label}</li>)}</ul> : <p>該当するバリアントはありません。</p>}</section>
    <section className="reference-section"><h3>この属性を含意する属性</h3>{impliedBy.length ? <ul>{impliedBy.map(item => <li key={item.id}>{item.name}</li>)}</ul> : <p>この属性を含意する属性はありません。</p>}</section>
  </>;

  return <EntityEditorLayout entityId={attribute.id} deleteLabel="属性を削除" onDelete={onDelete}
    renderView={() => <><div className="detail-view-field"><div className="detail-view-label">名前</div><div>{attribute.name || "未設定"}</div></div><div className="detail-view-field"><div className="detail-view-label">含意する属性</div><div>{attributeNames(attribute.implies)}</div></div>{references}</>}
    renderEdit={() => <><FormGroup label="名前"><InputGroup value={attribute.name} onChange={e => onChange({ ...attribute, name: e.currentTarget.value })} /></FormGroup><FormGroup label="含意する属性"><AttributeMultiSelect attributes={data.attributes} selectedIds={attribute.implies} excludeId={attribute.id} onChange={implies => onChange({ ...attribute, implies })} /></FormGroup>{references}</>}
  />;
}
