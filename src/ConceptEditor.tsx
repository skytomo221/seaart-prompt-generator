import {
  Button,
  Card,
  FormGroup,
  HTMLSelect,
  InputGroup,
} from "@blueprintjs/core";
import { Concept, Data } from "./data";
import { v4 as uuid } from "uuid";
import PromptFragmentEditor from "./domain/PromptFragmentEditor";
import AttributeMultiSelect from "./AttributeMultiSelect";
import EntityEditorLayout from "./EntityEditorLayout";

interface Props {
  concept: Concept;
  data: Data;
  onChange: (c: Concept) => void;
  onDelete: () => void;
  onDeletePreset: (id: string) => void;
  onDeleteGroup: (id: string) => void;
  onDeleteVariant: (id: string) => void;
}

export default function ConceptEditor({
  concept,
  data,
  onChange,
  onDelete,
  onDeletePreset,
  onDeleteGroup,
  onDeleteVariant,
}: Props) {
  const patch = (p: Partial<Concept>) => onChange({ ...concept, ...p });
  const setGroup = (
    id: string,
    fn: (
      g: Concept["variantGroups"][number],
    ) => Concept["variantGroups"][number],
  ) =>
    patch({
      variantGroups: concept.variantGroups.map((group) =>
        group.id === id ? fn(group) : group,
      ),
    });
  const selection = (preset: Concept["presets"][number], groupId: string) =>
    preset.variantSelections.find((item) => item.groupId === groupId)
      ?.variantId;
  const changeSelection = (
    presetId: string,
    groupId: string,
    variantId?: string,
  ) =>
    patch({
      presets: concept.presets.map((preset) => {
        if (preset.id !== presetId) return preset;
        const selections = preset.variantSelections.filter(
          (item) => item.groupId !== groupId,
        );
        if (variantId) selections.push({ groupId, variantId });
        return { ...preset, variantSelections: selections };
      }),
    });
  const attributeNames = (ids: string[]) =>
    ids
      .map(
        (id) =>
          data.attributes.find((attribute) => attribute.id === id)?.name ?? id,
      )
      .join("、") || "未設定";

  const renderView = () => (
    <>
      <div className="detail-view-field">
        <div className="detail-view-label">名前</div>
        <div>{concept.name || "未設定"}</div>
      </div>
      <div className="detail-view-field">
        <div className="detail-view-label">カテゴリ</div>
        <div>
          {data.categories.find(
            (category) => category.id === concept.categoryId,
          )?.name ?? "未設定"}
        </div>
      </div>
      <div className="detail-view-field">
        <div className="detail-view-label">属性</div>
        <div>{attributeNames(concept.attributeIds)}</div>
      </div>
      <section className="detail-section">
        <div className="detail-section-label">バリアントグループ</div>
        {concept.variantGroups.length ? (
          concept.variantGroups.map((group) => (
            <Card key={group.id} compact className="editor-card">
              <div>{group.name || "名称未設定"}</div>
              {group.variants.length ? (
                <ul className="detail-view-list">
                  {group.variants.map((variant) => (
                    <li key={variant.id}>
                      {variant.name || "名称未設定"}
                      <span className="detail-view-muted">
                        {" "}
                        — {attributeNames(variant.attributeIds)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="detail-view-muted">
                  バリアントはありません。
                </div>
              )}
            </Card>
          ))
        ) : (
          <div className="detail-view-muted">
            バリアントグループはありません。
          </div>
        )}
      </section>
      <section className="detail-section">
        <div className="detail-section-label">プリセット</div>
        {concept.presets.length ? (
          concept.presets.map((preset) => (
            <Card key={preset.id} compact className="editor-card">
              <div>{preset.name || "名称未設定"}</div>
              {preset.variantSelections.length ? (
                <ul className="detail-view-list">
                  {preset.variantSelections.map((item) => {
                    const group = concept.variantGroups.find(
                      (g) => g.id === item.groupId,
                    );
                    const variantId = item.variantId;
                    const name =
                      group?.variants.find((v) => v.id === variantId)?.name ??
                      variantId;
                    return (
                      <li key={item.groupId}>
                        {group?.name ?? item.groupId}: {name || "未設定"}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="detail-view-muted">
                  バリアント選択はありません。
                </div>
              )}
            </Card>
          ))
        ) : (
          <div className="detail-view-muted">プリセットはありません。</div>
        )}
      </section>
      <PromptFragmentEditor
        label="フラグメント"
        value={concept.promptFragments}
        concepts={data.concepts}
        categories={data.categories}
        attributes={data.attributes}
        onChange={() => {}}
      />
      <PromptFragmentEditor
        negative
        label="ネガティブフラグメント"
        value={concept.negativePromptFragments}
        concepts={data.concepts}
        categories={data.categories}
        attributes={data.attributes}
        onChange={() => {}}
      />
    </>
  );

  const renderEdit = (showDangerous: boolean) => (
    <>
      <FormGroup label="名前">
        <InputGroup
          value={concept.name}
          onChange={(event) => patch({ name: event.currentTarget.value })}
        />
      </FormGroup>
      <FormGroup label="カテゴリ">
        <HTMLSelect
          fill
          value={concept.categoryId}
          onChange={(event) => patch({ categoryId: event.currentTarget.value })}
        >
          <option value="">選択</option>
          {data.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </HTMLSelect>
      </FormGroup>
      <FormGroup label="属性">
        <AttributeMultiSelect
          attributes={data.attributes}
          selectedIds={concept.attributeIds}
          onChange={(attributeIds) => patch({ attributeIds })}
        />
      </FormGroup>
      <section className="detail-section">
        <div className="detail-section-label">バリアントグループ</div>
        {concept.variantGroups.map((group) => (
          <Card key={group.id} compact className="editor-card">
            <InputGroup
              placeholder="バリアントグループ名"
              value={group.name}
              onChange={(event) =>
                setGroup(group.id, (current) => ({
                  ...current,
                  name: event.currentTarget.value,
                }))
              }
            />
            {group.variants.map((variant) => (
              <div className="variant-edit" key={variant.id}>
                <FormGroup label="バリアント名">
                  <InputGroup
                    placeholder="新しいバリアント"
                    value={variant.name}
                    onChange={(event) =>
                      setGroup(group.id, (current) => ({
                        ...current,
                        variants: current.variants.map((item) =>
                          item.id === variant.id
                            ? { ...item, name: event.currentTarget.value }
                            : item,
                        ),
                      }))
                    }
                  />
                </FormGroup>
                <FormGroup label="属性">
                  <AttributeMultiSelect
                    attributes={data.attributes}
                    selectedIds={variant.attributeIds}
                    onChange={(attributeIds) =>
                      setGroup(group.id, (current) => ({
                        ...current,
                        variants: current.variants.map((item) =>
                          item.id === variant.id
                            ? { ...item, attributeIds }
                            : item,
                        ),
                      }))
                    }
                  />
                </FormGroup>
                {showDangerous && (
                  <Button
                    icon="cross"
                    intent="danger"
                    variant="minimal"
                    aria-label="バリアントを削除"
                    onClick={() => onDeleteVariant(variant.id)}
                  />
                )}
              </div>
            ))}
            <Button
              small
              icon="add"
              onClick={() =>
                setGroup(group.id, (current) => ({
                  ...current,
                  variants: [
                    ...current.variants,
                    { id: uuid(), name: "新しいバリアント", attributeIds: [] },
                  ],
                }))
              }
            >
              バリアントを追加
            </Button>
            {showDangerous && (
              <Button
                small
                intent="danger"
                onClick={() => onDeleteGroup(group.id)}
              >
                バリアントグループを削除
              </Button>
            )}
          </Card>
        ))}
        <Button
          small
          icon="add"
          onClick={() =>
            patch({
              variantGroups: [
                ...concept.variantGroups,
                {
                  id: uuid(),
                  name: "新しいバリアントグループ",
                  variants: [],
                },
              ],
            })
          }
        >
          バリアントグループを追加
        </Button>
      </section>
      <section className="detail-section">
        <div className="detail-section-label">プリセット</div>
        {concept.presets.map((preset, index) => (
          <Card key={preset.id} compact className="editor-card">
            <div className="preset-edit-header">
              <InputGroup
                value={preset.name}
                onChange={(event) =>
                  patch({
                    presets: concept.presets.map((item) =>
                      item.id === preset.id
                        ? { ...item, name: event.currentTarget.value }
                        : item,
                    ),
                  })
                }
              />
              <Button
                icon="arrow-up"
                aria-label="プリセットを上へ"
                disabled={!index}
                onClick={() => {
                  const items = [...concept.presets];
                  [items[index - 1], items[index]] = [
                    items[index],
                    items[index - 1],
                  ];
                  patch({ presets: items });
                }}
              />
              <Button
                icon="arrow-down"
                aria-label="プリセットを下へ"
                disabled={index === concept.presets.length - 1}
                onClick={() => {
                  const items = [...concept.presets];
                  [items[index], items[index + 1]] = [
                    items[index + 1],
                    items[index],
                  ];
                  patch({ presets: items });
                }}
              />
              {showDangerous && (
                <Button
                  icon="trash"
                  intent="danger"
                  variant="minimal"
                  aria-label="プリセットを削除"
                  onClick={() => onDeletePreset(preset.id)}
                />
              )}
            </div>
            {concept.variantGroups.map((group) => (
              <FormGroup
                key={group.id}
                label={group.name}
                className="preset-variant-group"
              >
                <HTMLSelect
                  fill
                  value={selection(preset, group.id) ?? ""}
                  onChange={(event) =>
                    changeSelection(
                      preset.id,
                      group.id,
                      event.currentTarget.value || undefined,
                    )
                  }
                >
                  <option value="">未選択</option>
                  {group.variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.name}
                    </option>
                  ))}
                </HTMLSelect>
              </FormGroup>
            ))}
          </Card>
        ))}
        <Button
          small
          icon="add"
          onClick={() =>
            patch({
              presets: [
                ...concept.presets,
                { id: uuid(), name: concept.name, variantSelections: [] },
              ],
            })
          }
        >
          プリセットを追加
        </Button>
      </section>
      <PromptFragmentEditor
        label="フラグメント"
        value={concept.promptFragments}
        concepts={data.concepts}
        categories={data.categories}
        attributes={data.attributes}
        onChange={(promptFragments) => patch({ promptFragments })}
      />
      <PromptFragmentEditor
        negative
        label="ネガティブフラグメント"
        value={concept.negativePromptFragments}
        concepts={data.concepts}
        categories={data.categories}
        attributes={data.attributes}
        onChange={(negativePromptFragments) =>
          patch({ negativePromptFragments })
        }
      />
    </>
  );

  return (
    <EntityEditorLayout
      entityId={concept.id}
      deleteLabel="コンセプトを削除"
      onDelete={onDelete}
      renderView={renderView}
      renderEdit={renderEdit}
    />
  );
}
