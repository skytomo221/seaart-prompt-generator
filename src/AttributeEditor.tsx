import { FormGroup, InputGroup } from "@blueprintjs/core";
import { Attribute, Data } from "./data";
import AttributeMultiSelect from "./AttributeMultiSelect";
import {
  canAddAttributeParent,
  getAttributeChildren,
  setAttributeParents,
  setAttributeChildren,
} from "./domain/attributeRelations";
import EntityEditorLayout from "./EntityEditorLayout";

export default function AttributeEditor({
  attribute,
  data,
  onDataChange,
  onDelete,
}: {
  attribute: Attribute;
  data: Data;
  onDataChange: (data: Data) => void;
  onDelete: () => void;
}) {
  const concepts = data.concepts.filter((concept) =>
    concept.attributeIds.includes(attribute.id),
  );
  const categories = data.categories.filter((category) =>
    category.attributeIds.includes(attribute.id),
  );
  const variants = data.concepts.flatMap((concept) =>
    concept.variantGroups.flatMap((group) =>
      group.variants
        .filter((variant) => variant.attributeIds.includes(attribute.id))
        .map((variant) => `${concept.name} / ${group.name} / ${variant.name}`),
    ),
  );
  const children = getAttributeChildren(data.attributes, attribute.id);
  const attributeNames = (ids: string[]) =>
    ids
      .map((id) => data.attributes.find((item) => item.id === id)?.name ?? id)
      .join("、") || "未設定";

  const references = (
    <>
      <section className="reference-section">
        <h3>この属性が設定されているコンセプト</h3>
        {concepts.length ? (
          <ul>
            {concepts.map((concept) => (
              <li key={concept.id}>{concept.name}</li>
            ))}
          </ul>
        ) : (
          <p>該当するコンセプトはありません。</p>
        )}
      </section>
      <section className="reference-section">
        <h3>この属性が設定されているカテゴリ</h3>
        {categories.length ? (
          <ul>
            {categories.map((category) => (
              <li key={category.id}>{category.name}</li>
            ))}
          </ul>
        ) : (
          <p>該当するカテゴリはありません。</p>
        )}
      </section>
      <section className="reference-section">
        <h3>この属性が設定されているバリアント</h3>
        {variants.length ? (
          <ul>
            {variants.map((label, index) => (
              <li key={`${label}-${index}`}>{label}</li>
            ))}
          </ul>
        ) : (
          <p>該当するバリアントはありません。</p>
        )}
      </section>
    </>
  );

  return (
    <EntityEditorLayout
      entityId={attribute.id}
      deleteLabel="属性を削除"
      onDelete={onDelete}
      renderView={() => (
        <>
          <div className="detail-view-field">
            <div className="detail-view-label">名前</div>
            <div>{attribute.name || "未設定"}</div>
          </div>
          <div className="detail-view-field">
            <div className="detail-view-label">親属性</div>
            <div>{attributeNames(attribute.implies)}</div>
          </div>
          <div className="detail-view-field">
            <div className="detail-view-label">子属性</div>
            <div>{attributeNames(children.map((child) => child.id))}</div>
          </div>
          {references}
        </>
      )}
      renderEdit={() => (
        <>
          <FormGroup label="名前">
            <InputGroup
              value={attribute.name}
              onChange={(e) =>
                onDataChange({
                  ...data,
                  attributes: data.attributes.map((item) =>
                    item.id === attribute.id
                      ? { ...item, name: e.currentTarget.value }
                      : item,
                  ),
                })
              }
            />
          </FormGroup>
          <FormGroup label="親属性">
            <AttributeMultiSelect
              attributes={data.attributes.filter(
                (candidate) =>
                  attribute.implies.includes(candidate.id) ||
                  canAddAttributeParent(
                    data.attributes,
                    attribute.id,
                    candidate.id,
                  ),
              )}
              selectedIds={attribute.implies}
              excludeId={attribute.id}
              onChange={(ids) =>
                onDataChange(setAttributeParents(data, attribute.id, ids))
              }
            />
          </FormGroup>
          <FormGroup label="子属性">
            <AttributeMultiSelect
              attributes={data.attributes.filter(
                (candidate) =>
                  children.some((child) => child.id === candidate.id) ||
                  canAddAttributeParent(
                    data.attributes,
                    candidate.id,
                    attribute.id,
                  ),
              )}
              selectedIds={children.map((child) => child.id)}
              excludeId={attribute.id}
              onChange={(ids) =>
                onDataChange(setAttributeChildren(data, attribute.id, ids))
              }
            />
          </FormGroup>
          {references}
        </>
      )}
    />
  );
}
