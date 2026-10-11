import { Button, HTMLSelect } from "@blueprintjs/core";
import { Attribute, Category, Condition, Concept, ConceptConditionOperator, InstanceExistence, VariantRequirement } from "../data";
import EntitySuggest, { EntityOption } from "./EntitySuggest";
import { createInitialCondition } from "./conditionDefaults";

type ConditionKind = "all" | "any" | "category" | "concept" | "preset" | "attribute";
interface Props {
  value: Condition;
  onChange(value: Condition): void;
  concepts: Concept[];
  categories: Category[];
  attributes: Attribute[];
  nested?: boolean;
}

function kindOf(condition: Condition): ConditionKind {
  if ("all" in condition) return "all";
  if ("any" in condition) return "any";
  if ("category" in condition) return "category";
  if ("concept" in condition) return "concept";
  if ("preset" in condition) return "preset";
  return "attribute";
}

function ExistenceSelect({ value, onChange }: { value: InstanceExistence; onChange(value: InstanceExistence): void }) {
  return <>
    <span>インスタンスが存在</span>
    <HTMLSelect aria-label="インスタンスの存在" value={value} onChange={event => onChange(event.currentTarget.value as InstanceExistence)}>
      <option value="exists">する</option>
      <option value="notExists">しない</option>
    </HTMLSelect>
  </>;
}

export default function ConditionEditor({ value, onChange, concepts, categories, attributes, nested = false }: Props) {
  const kind = kindOf(value);
  const presets: EntityOption[] = concepts.flatMap(concept => concept.presets.map(preset => ({
    id: preset.id,
    label: `${concept.name} / ${preset.name || "（名前なし）"}`,
    searchText: `${concept.name} ${preset.name}`,
  })));
  const initial = createInitialCondition(concepts, categories, attributes);

  const makeForKind = (next: ConditionKind): Condition | undefined => {
    if (next === "all") return { all: [value] };
    if (next === "any") return { any: [value] };
    if (next === "category") return categories[0] ? { category: { categoryId: categories[0].id, operator: "is", existence: "exists" } } : undefined;
    if (next === "concept") return concepts[0] ? { concept: { conceptId: concepts[0].id, operator: "is", existence: "exists" } } : undefined;
    if (next === "preset") return presets[0] ? { preset: { presetId: presets[0].id, operator: "is", existence: "exists" } } : undefined;
    return attributes[0] ? { attribute: { attributeId: attributes[0].id, operator: "is", existence: "exists" } } : undefined;
  };

  const changeKind = (next: ConditionKind) => {
    if (next === kind) return;
    const replacement = makeForKind(next);
    if (replacement) onChange(replacement);
  };

  const kindSelect = <HTMLSelect aria-label="条件の種類" value={kind} onChange={event => changeKind(event.currentTarget.value as ConditionKind)}>
    <option value="all">以下のすべてを満たす</option>
    <option value="any">以下のどれかを満たす</option>
    <option value="category" disabled={!categories.length}>カテゴリが</option>
    <option value="concept" disabled={!concepts.length}>コンセプトが</option>
    <option value="preset" disabled={!presets.length}>プリセットが</option>
    <option value="attribute" disabled={!attributes.length}>属性が</option>
  </HTMLSelect>;

  if ("all" in value || "any" in value) {
    const groupKind: "all" | "any" = "all" in value ? "all" : "any";
    const children = "all" in value ? value.all : value.any;
    const setChildren = (next: Condition[]) => onChange(groupKind === "all" ? { all: next } : { any: next });
    return <div className={`condition-editor condition-group${nested ? " is-nested" : ""}`}>
      <div className="condition-row">{kindSelect}</div>
      <div className="condition-children">
        {children.map((child, index) => <div className="condition-child" key={index}>
          <ConditionEditor value={child} onChange={next => { const list = [...children]; list[index] = next; setChildren(list); }} nested {...{ concepts, categories, attributes }} />
          <Button small icon="cross" intent="danger" aria-label="条件を削除" disabled={children.length <= 1} onClick={() => setChildren(children.filter((_, childIndex) => childIndex !== index))} />
        </div>)}
        <Button small icon="add" disabled={!initial} onClick={() => initial && setChildren([...children, initial])}>条件を追加</Button>
      </div>
    </div>;
  }

  if ("category" in value) {
    return <div className="condition-editor condition-atomic"><div className="condition-row">
      {kindSelect}
      <div className="condition-suggest"><EntitySuggest items={categories.map(category => ({ id: category.id, label: category.name }))} selectedId={value.category.categoryId} placeholder="カテゴリを検索..." onChange={id => id && onChange({ category: { ...value.category, categoryId: id } })} /></div>
      <HTMLSelect aria-label="条件の肯定・否定" value={value.category.operator} onChange={event => onChange({ category: { ...value.category, operator: event.currentTarget.value as "is" | "isNot" } })}><option value="is">である</option><option value="isNot">ではない</option></HTMLSelect>
      <ExistenceSelect value={value.category.existence} onChange={existence => onChange({ category: { ...value.category, existence } })} />
    </div></div>;
  }

  if ("attribute" in value) {
    return <div className="condition-editor condition-atomic"><div className="condition-row">
      {kindSelect}
      <div className="condition-suggest"><EntitySuggest items={attributes.map(attribute => ({ id: attribute.id, label: attribute.name }))} selectedId={value.attribute.attributeId} placeholder="属性を検索..." onChange={id => id && onChange({ attribute: { ...value.attribute, attributeId: id } })} /></div>
      <HTMLSelect aria-label="条件の肯定・否定" value={value.attribute.operator} onChange={event => onChange({ attribute: { ...value.attribute, operator: event.currentTarget.value as "is" | "isNot" } })}><option value="is">である</option><option value="isNot">ではない</option></HTMLSelect>
      <ExistenceSelect value={value.attribute.existence} onChange={existence => onChange({ attribute: { ...value.attribute, existence } })} />
    </div></div>;
  }

  if ("preset" in value) {
    return <div className="condition-editor condition-atomic"><div className="condition-row">
      {kindSelect}
      <div className="condition-suggest"><EntitySuggest items={presets} selectedId={value.preset.presetId} placeholder="プリセットを検索..." onChange={id => id && onChange({ preset: { ...value.preset, presetId: id } })} /></div>
      <HTMLSelect aria-label="条件の肯定・否定" value={value.preset.operator} onChange={event => onChange({ preset: { ...value.preset, operator: event.currentTarget.value as "is" | "isNot" } })}><option value="is">である</option><option value="isNot">ではない</option></HTMLSelect>
      <ExistenceSelect value={value.preset.existence} onChange={existence => onChange({ preset: { ...value.preset, existence } })} />
    </div></div>;
  }

  if (!("concept" in value)) return null;
  const selectedConcept = concepts.find(concept => concept.id === value.concept.conceptId);
  const hasVariants = !!selectedConcept?.variantGroups.some(group => group.variants.length > 0);
  const requirements = value.concept.variants ?? [];
  const usesVariants = value.concept.operator === "variantsMatch" || value.concept.operator === "variantsDoNotMatch";
  const operatorLabels: { value: ConceptConditionOperator; label: string; disabled?: boolean }[] = [
    { value: "is", label: "である" },
    { value: "isNot", label: "ではない" },
    { value: "variantsMatch", label: "でバリアントが次のとき", disabled: !hasVariants },
    { value: "variantsDoNotMatch", label: "でバリアントが次ではないとき", disabled: !hasVariants },
  ];

  const updateRequirement = (index: number, patch: Partial<VariantRequirement>) => {
    const next = requirements.map((requirement, requirementIndex) => requirementIndex === index ? { ...requirement, ...patch } : requirement);
    onChange({ concept: { ...value.concept, variants: next } });
  };
  const addRequirement = () => {
    const group = selectedConcept?.variantGroups.find(candidate => candidate.variants.length > 0);
    const variant = group?.variants[0];
    if (!group || !variant) return;
    onChange({ concept: { ...value.concept, variants: [...requirements, { groupId: group.id, variantId: variant.id }] } });
  };

  return <div className="condition-editor condition-atomic">
    <div className="condition-row">
      {kindSelect}
      <div className="condition-suggest"><EntitySuggest items={concepts.map(concept => ({ id: concept.id, label: concept.name }))} selectedId={value.concept.conceptId} placeholder="コンセプトを検索..." onChange={id => {
        if (!id) return;
        onChange({ concept: { conceptId: id, operator: "is", existence: value.concept.existence } });
      }} /></div>
      <HTMLSelect aria-label="コンセプト条件" value={value.concept.operator} onChange={event => {
        const operator = event.currentTarget.value as ConceptConditionOperator;
        if (operator === "is" || operator === "isNot") onChange({ concept: { conceptId: value.concept.conceptId, operator, existence: value.concept.existence } });
        else {
          const current = requirements.length ? requirements : (() => {
            const group = selectedConcept?.variantGroups.find(candidate => candidate.variants.length > 0);
            const variant = group?.variants[0];
            return group && variant ? [{ groupId: group.id, variantId: variant.id }] : [];
          })();
          onChange({ concept: { ...value.concept, operator, variants: current } });
        }
      }}>{operatorLabels.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}</HTMLSelect>
      <ExistenceSelect value={value.concept.existence} onChange={existence => onChange({ concept: { ...value.concept, existence } })} />
    </div>
    {usesVariants && <div className="condition-variant-requirements">
      {requirements.map((requirement, index) => {
        const groups = selectedConcept?.variantGroups.filter(group => group.variants.length > 0) ?? [];
        const group = groups.find(candidate => candidate.id === requirement.groupId);
        const variants = group?.variants ?? [];
        return <div className="condition-row condition-variant-row" key={`${requirement.groupId}-${index}`}>
          <span>バリアント</span>
          <div className="condition-suggest"><EntitySuggest items={groups.map(item => ({ id: item.id, label: item.name }))} selectedId={requirement.groupId} placeholder="バリアントグループを検索..." onChange={groupId => {
            const nextGroup = groups.find(item => item.id === groupId);
            const nextVariant = nextGroup?.variants[0];
            if (groupId && nextVariant) updateRequirement(index, { groupId, variantId: nextVariant.id });
          }} /></div>
          <span>が</span>
          <div className="condition-suggest"><EntitySuggest items={variants.map(variant => ({ id: variant.id, label: variant.name }))} selectedId={requirement.variantId} placeholder="バリアントを検索..." onChange={variantId => variantId && updateRequirement(index, { variantId })} /></div>
          <Button small icon="cross" intent="danger" aria-label="バリアント条件を削除" onClick={() => onChange({ concept: { ...value.concept, variants: requirements.filter((_, requirementIndex) => requirementIndex !== index) } })} />
        </div>;
      })}
      <Button small icon="add" disabled={!hasVariants} onClick={addRequirement}>バリアントを追加する</Button>
      {!requirements.length && <small className="condition-validation">バリアントを1つ以上指定してください。</small>}
    </div>}
  </div>;
}
