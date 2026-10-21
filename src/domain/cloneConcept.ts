import { v4 as uuid } from "uuid";
import type {
  Concept,
  Condition,
  PromptFragment,
  PromptFragmentSet,
} from "../data";

/** Clone owned entities and their references, preserving references outside source. */
export function cloneConcept(source: Concept): Concept {
  const conceptId = uuid();
  const groups = new Map(
    source.variantGroups.map((group) => [group.id, uuid()]),
  );
  const variants = new Map(
    source.variantGroups.flatMap((group) =>
      group.variants.map((variant) => [variant.id, uuid()] as const),
    ),
  );
  const presets = new Map(source.presets.map((preset) => [preset.id, uuid()]));
  const fragments = new Map(
    [source.promptFragments, source.negativePromptFragments].flatMap((set) =>
      set.definitions.map((definition) => [definition.id, uuid()] as const),
    ),
  );
  const remap = (ids: Map<string, string>, id: string) => ids.get(id) ?? id;
  const copy = structuredClone(source);
  const fragment = (value: PromptFragment): PromptFragment => {
    if (typeof value === "string") return value;
    if ("fragmentId" in value)
      return { fragmentId: remap(fragments, value.fragmentId) };
    return {
      parts: value.parts.map((part) =>
        typeof part === "string"
          ? part
          : { fragmentId: remap(fragments, part.fragmentId) },
      ),
    };
  };
  const condition = (value: Condition): Condition => {
    if ("all" in value) return { all: value.all.map(condition) };
    if ("any" in value) return { any: value.any.map(condition) };
    if ("selfVariantGroup" in value)
      return {
        selfVariantGroup: {
          groupId: remap(groups, value.selfVariantGroup.groupId),
          cases: value.selfVariantGroup.cases.map((item) => ({
            variantId: remap(variants, item.variantId),
            fragments: item.fragments.map(fragment),
          })),
        },
      };
    if ("preset" in value)
      return {
        preset: {
          ...value.preset,
          presetId: remap(presets, value.preset.presetId),
        },
      };
    if ("concept" in value)
      return {
        concept: {
          ...value.concept,
          conceptId:
            value.concept.conceptId === source.id
              ? conceptId
              : value.concept.conceptId,
          ...(value.concept.variants && {
            variants: value.concept.variants.map((item) => ({
              groupId: remap(groups, item.groupId),
              variantId: remap(variants, item.variantId),
            })),
          }),
        },
      };
    return value;
  };
  const set = (value: PromptFragmentSet): PromptFragmentSet => ({
    root: value.root.map(fragment),
    definitions: value.definitions.map((definition) => ({
      ...definition,
      id: remap(fragments, definition.id),
      if: condition(definition.if),
      fragments: definition.fragments.map(fragment),
    })),
  });
  copy.id = conceptId;
  copy.variantGroups.forEach((group) => {
    group.id = remap(groups, group.id);
    group.variants.forEach((variant) => {
      variant.id = remap(variants, variant.id);
    });
  });
  copy.presets.forEach((preset) => {
    preset.id = remap(presets, preset.id);
    preset.variantSelections = preset.variantSelections.map((item) => ({
      groupId: remap(groups, item.groupId),
      variantId: remap(variants, item.variantId),
    }));
  });
  copy.promptFragments = set(copy.promptFragments);
  copy.negativePromptFragments = set(copy.negativePromptFragments);
  return copy;
}
