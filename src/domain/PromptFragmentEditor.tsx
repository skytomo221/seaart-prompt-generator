import {
  Button,
  Card,
  FormGroup,
  InputGroup,
  TextArea,
} from "@blueprintjs/core";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Attribute,
  Category,
  Condition,
  Concept,
  Id,
  NamedPromptFragment,
  PromptFragment,
  PromptFragmentSet,
} from "../data";
import ConditionEditor from "./ConditionEditor";
import "./namedFragments.css";
import { createInitialCondition } from "./conditionDefaults";

interface Props {
  value: PromptFragmentSet;
  onChange(value: PromptFragmentSet): void;
  concepts: Concept[];
  categories: Category[];
  attributes: Attribute[];
  label: string;
  negative?: boolean;
  readOnly?: boolean;
}

export function reorderDefinitions(
  value: PromptFragmentSet,
  activeId: string,
  overId: string,
): PromptFragmentSet {
  if (activeId === overId) return value;
  const from = value.definitions.findIndex((item) => item.id === activeId);
  const to = value.definitions.findIndex((item) => item.id === overId);
  if (from < 0 || to < 0) return value;
  return { ...value, definitions: arrayMove(value.definitions, from, to) };
}

function SortableNamedFragmentCard({
  id,
  children,
}: {
  id: Id;
  children(handle: ReactNode): ReactNode;
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    attributes,
    listeners,
  } = useSortable({ id });
  return (
    <Card
      compact
      className="named-fragment-card"
      ref={setNodeRef}
      style={{
        // Keep each card at its original size when hovering over taller/shorter cards.
        transform: CSS.Translate.toString(transform),
        position: "relative",
        zIndex: isDragging ? 1 : undefined,
        transition,
        opacity: isDragging ? 0.3 : 1,
      }}
    >
      {children(
        <Button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          icon="drag-handle-vertical"
          variant="minimal"
          size="small"
          aria-label="ドラッグして並べ替え"
          style={{ flex: "0 0 auto", cursor: "grab", touchAction: "none" }}
        />,
      )}
    </Card>
  );
}

export function formatFragmentSequence(
  fragments: PromptFragment[],
  set: PromptFragmentSet,
): string {
  return fragments
    .map((fragment) => {
      if (typeof fragment === "string") return fragment;
      const definition = set.definitions.find(
        (candidate) => candidate.id === fragment.fragmentId,
      );
      return definition
        ? `#[${definition.name}]`
        : `#[不明:${fragment.fragmentId}]`;
    })
    .join(", ");
}

export function parseFragmentSequence(
  text: string,
  set: PromptFragmentSet,
): { fragments?: PromptFragment[]; error?: string } {
  const fragments: PromptFragment[] = [];
  for (const raw of text.split(",")) {
    const token = raw.trim();
    if (!token) continue;
    const match = token.match(/^#\[(.+)]$/);
    if (!match) {
      fragments.push(token);
      continue;
    }
    const matches = set.definitions.filter(
      (definition) => definition.name === match[1],
    );
    if (!matches.length)
      return { error: `名前付きフラグメント「${match[1]}」が見つかりません。` };
    if (matches.length > 1)
      return {
        error: `名前付きフラグメント名「${match[1]}」が重複しています。`,
      };
    fragments.push({ fragmentId: matches[0].id });
  }
  return { fragments };
}

function definitionFragments(
  definition: NamedPromptFragment,
): PromptFragment[] {
  if ("selfVariantGroup" in definition.if)
    return definition.if.selfVariantGroup.cases.flatMap(
      (item) => item.fragments,
    );
  return definition.fragments;
}

export function findFragmentCycle(set: PromptFragmentSet): Id[] | undefined {
  const definitions = new Map(
    set.definitions.map((definition) => [definition.id, definition]),
  );
  const visited = new Set<Id>();
  const visiting = new Set<Id>();
  const path: Id[] = [];
  const visit = (id: Id): Id[] | undefined => {
    if (visiting.has(id)) {
      const index = path.indexOf(id);
      return [...path.slice(index), id];
    }
    if (visited.has(id)) return undefined;
    visiting.add(id);
    path.push(id);
    const definition = definitions.get(id);
    for (const fragment of definition ? definitionFragments(definition) : []) {
      if (typeof fragment === "string") continue;
      const cycle = visit(fragment.fragmentId);
      if (cycle) return cycle;
    }
    path.pop();
    visiting.delete(id);
    visited.add(id);
    return undefined;
  };
  for (const id of definitions.keys()) {
    const cycle = visit(id);
    if (cycle) return cycle;
  }
  return undefined;
}

function referencesDefinition(set: PromptFragmentSet, id: Id): boolean {
  const has = (fragments: PromptFragment[]) =>
    fragments.some(
      (fragment) => typeof fragment !== "string" && fragment.fragmentId === id,
    );
  return (
    has(set.root) ||
    set.definitions.some(
      (definition) =>
        definition.id !== id && has(definitionFragments(definition)),
    )
  );
}

function nextName(set: PromptFragmentSet, negative: boolean): string {
  const base = negative
    ? "名前付きネガティブフラグメント"
    : "名前付きフラグメント";
  let index = 1;
  let candidate = base;
  while (set.definitions.some((definition) => definition.name === candidate))
    candidate = `${base}${++index}`;
  return candidate;
}

function SequenceEditor({
  sequence,
  set,
  onChange,
  onError,
  ariaLabel,
}: {
  sequence: PromptFragment[];
  set: PromptFragmentSet;
  onChange(sequence: PromptFragment[]): void;
  onError?(message: string): void;
  ariaLabel: string;
}) {
  const formatted = useMemo(
    () => formatFragmentSequence(sequence, set),
    [sequence, set],
  );
  const [draft, setDraft] = useState(formatted);
  const [error, setError] = useState("");
  useEffect(() => setDraft(formatted), [formatted]);
  const update = (text: string) => {
    setDraft(text);
    const parsed = parseFragmentSequence(text, set);
    if (parsed.error) {
      setError(parsed.error);
      onError?.(parsed.error);
      return;
    }
    setError("");
    onError?.("");
    onChange(parsed.fragments ?? []);
  };
  return (
    <>
      <TextArea
        fill
        aria-label={ariaLabel}
        value={draft}
        onChange={(event) => update(event.currentTarget.value)}
      />
      {error && <small className="condition-validation">{error}</small>}
    </>
  );
}

function ReadOnlyCondition({
  value,
  concepts,
  categories,
  attributes,
  selfConcept,
}: {
  value: Condition;
  concepts: Concept[];
  categories: Category[];
  attributes: Attribute[];
  selfConcept?: Concept;
}) {
  if ("all" in value || "any" in value) {
    const items = "all" in value ? value.all : value.any;
    const label =
      "all" in value ? "以下のすべてを満たす" : "以下のどれかを満たす";
    return (
      <div className="readonly-condition-group">
        <div>{label}</div>
        <ul>
          {items.map((item, index) => (
            <li key={index}>
              <ReadOnlyCondition
                value={item}
                {...{ concepts, categories, attributes, selfConcept }}
              />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if ("selfVariantGroup" in value) {
    const group = selfConcept?.variantGroups.find(
      (item) => item.id === value.selfVariantGroup.groupId,
    );
    return (
      <span>
        このインスタンスのバリアントグループ「
        {group?.name ?? "不明なバリアントグループ"}」
      </span>
    );
  }

  const existence =
    "category" in value
      ? value.category.existence
      : "attribute" in value
        ? value.attribute.existence
        : "preset" in value
          ? value.preset.existence
          : value.concept.existence;
  const existenceLabel =
    existence === "exists"
      ? "インスタンスが存在する"
      : "インスタンスが存在しない";

  if ("category" in value) {
    const name =
      categories.find((category) => category.id === value.category.categoryId)
        ?.name ?? "不明なカテゴリ";
    return (
      <span>
        カテゴリが「{name}」
        {value.category.operator === "is" ? "である" : "ではない"}{" "}
        {existenceLabel}
      </span>
    );
  }
  if ("attribute" in value) {
    const name =
      attributes.find(
        (attribute) => attribute.id === value.attribute.attributeId,
      )?.name ?? "不明な属性";
    return (
      <span>
        属性が「{name}」
        {value.attribute.operator === "is" ? "である" : "ではない"}{" "}
        {existenceLabel}
      </span>
    );
  }
  if ("preset" in value) {
    const owner = concepts.find((concept) =>
      concept.presets.some((preset) => preset.id === value.preset.presetId),
    );
    const preset = owner?.presets.find(
      (item) => item.id === value.preset.presetId,
    );
    const name =
      owner && preset
        ? `${owner.name} / ${preset.name || "（名前なし）"}`
        : "不明なプリセット";
    return (
      <span>
        プリセットが「{name}」
        {value.preset.operator === "is" ? "である" : "ではない"}{" "}
        {existenceLabel}
      </span>
    );
  }

  const concept = concepts.find((item) => item.id === value.concept.conceptId);
  const conceptName = concept?.name ?? "不明なコンセプト";
  const operatorLabel =
    value.concept.operator === "is"
      ? "である"
      : value.concept.operator === "isNot"
        ? "ではない"
        : value.concept.operator === "variantsMatch"
          ? "でバリアントが次のとき"
          : "でバリアントが次ではないとき";
  const variants = value.concept.variants ?? [];
  return (
    <span>
      コンセプトが「{conceptName}」{operatorLabel}
      {variants.length > 0 && (
        <>
          （
          {variants
            .map((requirement) => {
              const group = concept?.variantGroups.find(
                (item) => item.id === requirement.groupId,
              );
              const variant = group?.variants.find(
                (item) => item.id === requirement.variantId,
              );
              return `${group?.name ?? "不明"}が${variant?.name ?? "不明"}`;
            })
            .join("、")}
          ）
        </>
      )}{" "}
      {existenceLabel}
    </span>
  );
}

export default function PromptFragmentEditor({
  value,
  onChange,
  concepts,
  categories,
  attributes,
  label,
  negative = false,
  readOnly = false,
}: Props) {
  const [error, setError] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );
  const reorder = ({ active, over }: DragEndEvent) => {
    if (!over) return;
    const next = reorderDefinitions(value, String(active.id), String(over.id));
    if (next !== value) onChange(next);
  };
  const initialCondition = createInitialCondition(
    concepts,
    categories,
    attributes,
  );
  const ownerConcept = concepts.find(
    (concept) =>
      concept.promptFragments === value ||
      concept.negativePromptFragments === value,
  );
  const namedLabel = negative
    ? "名前付きネガティブフラグメント"
    : "名前付きフラグメント";
  const summary = formatFragmentSequence(value.root, value) || "（空）";
  const patchDefinition = (
    id: Id,
    patch: Partial<PromptFragmentSet["definitions"][number]>,
  ) =>
    onChange({
      ...value,
      definitions: value.definitions.map((definition) =>
        definition.id === id ? { ...definition, ...patch } : definition,
      ),
    });
  const applyWithCycleCheck = (next: PromptFragmentSet) => {
    const cycle = findFragmentCycle(next);
    if (cycle) {
      const names = cycle.map(
        (fragmentId) =>
          next.definitions.find((definition) => definition.id === fragmentId)
            ?.name ?? fragmentId,
      );
      setError(
        `循環参照になるため保存できません: ${names.map((name) => `#[${name}]`).join(" → ")}`,
      );
      return;
    }
    setError("");
    onChange(next);
  };
  const updateDefinitionFragments = (id: Id, fragments: PromptFragment[]) => {
    const next: PromptFragmentSet = {
      ...value,
      definitions: value.definitions.map((definition) =>
        definition.id === id ? { ...definition, fragments } : definition,
      ),
    };
    applyWithCycleCheck(next);
  };
  const updateVariantCaseFragments = (
    id: Id,
    variantId: Id,
    fragments: PromptFragment[],
  ) => {
    const next: PromptFragmentSet = {
      ...value,
      definitions: value.definitions.map((definition) => {
        if (definition.id !== id || !("selfVariantGroup" in definition.if))
          return definition;
        const condition = definition.if.selfVariantGroup;
        const cases = condition.cases.filter(
          (item) => item.variantId !== variantId,
        );
        if (fragments.length) cases.push({ variantId, fragments });
        return {
          ...definition,
          if: { selfVariantGroup: { ...condition, cases } },
        };
      }),
    };
    applyWithCycleCheck(next);
  };
  const addDefinition = () => {
    const condition =
      initialCondition ??
      (ownerConcept?.variantGroups[0]
        ? {
            selfVariantGroup: {
              groupId: ownerConcept.variantGroups[0].id,
              cases: [],
            },
          }
        : undefined);
    if (!condition) return;
    onChange({
      ...value,
      definitions: [
        ...value.definitions,
        {
          id: crypto.randomUUID(),
          name: nextName(value, negative),
          if: condition,
          fragments: [],
        },
      ],
    });
  };

  const renderVariantCases = (
    definition: NamedPromptFragment,
    editable: boolean,
  ) => {
    if (!("selfVariantGroup" in definition.if)) return null;
    const condition = definition.if.selfVariantGroup;
    const group = ownerConcept?.variantGroups.find(
      (item) => item.id === condition.groupId,
    );
    if (!group)
      return (
        <small className="condition-validation">
          バリアントグループが見つかりません。
        </small>
      );
    return (
      <div className="named-fragment-list">
        {group.variants.map((variant) => {
          const fragments =
            condition.cases.find((item) => item.variantId === variant.id)
              ?.fragments ?? [];
          return (
            <div className="named-fragment-field" key={variant.id}>
              <b>{variant.name}のとき：</b>
              {editable ? (
                <SequenceEditor
                  sequence={fragments}
                  set={value}
                  ariaLabel={`${variant.name}のときの挿入フラグメント`}
                  onChange={(nextFragments) =>
                    updateVariantCaseFragments(
                      definition.id,
                      variant.id,
                      nextFragments,
                    )
                  }
                />
              ) : (
                <div className="prompt-fragment-summary">
                  {formatFragmentSequence(fragments, value) || "（空）"}
                </div>
              )}
            </div>
          );
        })}
        {!group.variants.length && (
          <small className="condition-validation">
            このバリアントグループにはバリアントがありません。
          </small>
        )}
      </div>
    );
  };

  return (
    <section className="prompt-fragment-section">
      <div className="prompt-fragment-section-header">
        <h3>{label}</h3>
      </div>
      {readOnly ? (
        <>
          <div className="prompt-fragment-summary">{summary}</div>
          {value.definitions.length > 0 && (
            <div className="named-fragment-list readonly-named-fragment-list">
              <h4>{namedLabel}</h4>
              {value.definitions.map((definition) => (
                <Card
                  compact
                  className="named-fragment-card"
                  key={definition.id}
                >
                  <div>
                    <b>名前：</b>#[{definition.name}]
                  </div>
                  <div className="named-fragment-field">
                    <b>条件：</b>
                    <ReadOnlyCondition
                      value={definition.if}
                      {...{
                        concepts,
                        categories,
                        attributes,
                        selfConcept: ownerConcept,
                      }}
                    />
                  </div>
                  {"selfVariantGroup" in definition.if ? (
                    renderVariantCases(definition, false)
                  ) : (
                    <div className="named-fragment-field">
                      <b>挿入フラグメント：</b>
                      <div className="prompt-fragment-summary">
                        {formatFragmentSequence(definition.fragments, value) ||
                          "（空）"}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="prompt-fragment-editor">
          <FormGroup
            label="本文"
            helperText="名前付きフラグメントは #[名前] と書いて挿入できます。"
          >
            <SequenceEditor
              sequence={value.root}
              set={value}
              ariaLabel={`${label}の本文`}
              onChange={(root) => onChange({ ...value, root })}
            />
          </FormGroup>
          <div className="named-fragment-list">
            <h4>{namedLabel}</h4>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={reorder}
            >
              <SortableContext
                items={value.definitions.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                {value.definitions.map((definition) => {
                  const duplicateName = value.definitions.some(
                    (other) =>
                      other.id !== definition.id &&
                      other.name === definition.name,
                  );
                  const referenced = referencesDefinition(value, definition.id);
                  return (
                    <SortableNamedFragmentCard
                      id={definition.id}
                      key={definition.id}
                    >
                      {(handle) => (
                        <>
                          <div className="named-fragment-name-row">
                            {handle}
                            <span>名前：#[</span>
                            <InputGroup
                              value={definition.name}
                              onChange={(event) =>
                                patchDefinition(definition.id, {
                                  name: event.currentTarget.value,
                                })
                              }
                            />
                            <span>]</span>
                            <Button
                              small
                              icon="trash"
                              intent="danger"
                              variant="minimal"
                              disabled={referenced}
                              aria-label={`${namedLabel}を削除`}
                              onClick={() =>
                                onChange({
                                  ...value,
                                  definitions: value.definitions.filter(
                                    (item) => item.id !== definition.id,
                                  ),
                                })
                              }
                            />
                          </div>
                          {duplicateName && (
                            <small className="condition-validation">
                              同じ名前の{namedLabel}
                              があります。名前はこの欄の中で一意にしてください。
                            </small>
                          )}
                          {referenced && (
                            <small className="fragment-reference-note">
                              他のフラグメントから参照されています。
                            </small>
                          )}
                          <div className="named-fragment-field">
                            <b>条件：</b>
                            <ConditionEditor
                              value={definition.if}
                              onChange={(condition) =>
                                patchDefinition(definition.id, {
                                  if: condition,
                                  ...("selfVariantGroup" in condition
                                    ? { fragments: [] }
                                    : {}),
                                })
                              }
                              selfConcept={ownerConcept}
                              {...{ concepts, categories, attributes }}
                            />
                          </div>
                          {"selfVariantGroup" in definition.if ? (
                            renderVariantCases(definition, true)
                          ) : (
                            <div className="named-fragment-field">
                              <b>挿入フラグメント：</b>
                              <SequenceEditor
                                sequence={definition.fragments}
                                set={value}
                                ariaLabel={`${definition.name}の挿入フラグメント`}
                                onChange={(fragments) =>
                                  updateDefinitionFragments(
                                    definition.id,
                                    fragments,
                                  )
                                }
                              />
                            </div>
                          )}
                        </>
                      )}
                    </SortableNamedFragmentCard>
                  );
                })}
              </SortableContext>
            </DndContext>
            <Button
              small
              icon="add"
              disabled={
                !initialCondition && !ownerConcept?.variantGroups.length
              }
              onClick={addDefinition}
            >
              {namedLabel}を追加
            </Button>
            {!initialCondition && !ownerConcept?.variantGroups.length && (
              <small className="condition-validation">
                条件に使用できるカテゴリ・コンセプト・プリセット・属性・バリアントグループがありません。
              </small>
            )}
          </div>
          {error && <div className="condition-validation">{error}</div>}
        </div>
      )}
    </section>
  );
}
