import { Menu, MenuItem, MenuDivider } from "@blueprintjs/core";
import type { MutableRefObject } from "react";
import { v4 as uuid } from "uuid";
import { Concept, Data, PromptGeneratorsData } from "./data";
import { cloneConcept } from "./domain/cloneConcept";
import ConceptList from "./ConceptList";
import ConceptEditor from "./ConceptEditor";
import { getDeletionReferences } from "./domain/references";

export default function ConceptsTab({
  data,
  onChange,
  generators,
  selectedId,
  onSelect,
  onError,
  scrollTopRef,
}: {
  data: Data;
  onChange: (d: Data) => void;
  generators: PromptGeneratorsData;
  selectedId: string;
  onSelect: (id: string) => void;
  onError: (message: string) => void;
  scrollTopRef: MutableRefObject<number>;
}) {
  const add = (at: number) => {
    const concept: Concept = {
      id: uuid(),
      name: "新しいコンセプト",
      categoryId: data.categories[0]?.id ?? "",
      attributeIds: [],
      variantGroups: [],
      presets: [
        { id: uuid(), name: "新しいコンセプト", variantSelections: [] },
      ],
      promptFragments: { root: [], definitions: [] },
      negativePromptFragments: { root: [], definitions: [] },
    };
    onChange({
      ...data,
      concepts: [
        ...data.concepts.slice(0, at),
        concept,
        ...data.concepts.slice(at),
      ],
    });
    onSelect(concept.id);
  };
  const duplicate = (id: string, position: "above" | "below") => {
    const index = data.concepts.findIndex((item) => item.id === id);
    if (index < 0) return;
    const copy = cloneConcept(data.concepts[index]);
    const at = index + (position === "below" ? 1 : 0);
    onChange({
      ...data,
      concepts: [
        ...data.concepts.slice(0, at),
        copy,
        ...data.concepts.slice(at),
      ],
    });
    onSelect(copy.id);
  };
  const update = (concept: Concept) => {
    const current = data.concepts.find((item) => item.id === concept.id);
    const updated =
      current &&
      current.name !== concept.name &&
      concept.variantGroups.length === 0 &&
      concept.presets.length === 1
        ? {
            ...concept,
            presets: [{ ...concept.presets[0], name: concept.name }],
          }
        : concept;
    onChange({
      ...data,
      concepts: data.concepts.map((item) =>
        item.id === concept.id ? updated : item,
      ),
    });
  };
  const remove = (
    kind: "concept" | "preset" | "variantGroup" | "variant",
    id: string,
  ) => {
    const concept = data.concepts.find(
      (item) => item.id === (kind === "concept" ? id : selectedId),
    );
    const refs = getDeletionReferences(kind, id, data, generators, concept);
    if (refs.length) {
      onError(`削除できません。参照元:\n${refs.join("\n")}`);
      return;
    }
    onError("");
    if (kind === "concept") {
      onChange({
        ...data,
        concepts: data.concepts.filter((item) => item.id !== id),
      });
      if (selectedId === id) onSelect("");
    } else if (kind === "preset")
      onChange({
        ...data,
        concepts: data.concepts.map((item) => ({
          ...item,
          presets: item.presets.filter((preset) => preset.id !== id),
        })),
      });
    else if (kind === "variantGroup")
      onChange({
        ...data,
        concepts: data.concepts.map((item) => ({
          ...item,
          variantGroups: item.variantGroups.filter((group) => group.id !== id),
        })),
      });
    else
      onChange({
        ...data,
        concepts: data.concepts.map((item) => ({
          ...item,
          variantGroups: item.variantGroups.map((group) => ({
            ...group,
            variants: group.variants.filter((variant) => variant.id !== id),
          })),
        })),
      });
  };
  const selected = data.concepts.find((concept) => concept.id === selectedId);
  const itemStyles = Object.fromEntries(
    data.concepts.map((concept) => {
      const category = data.categories.find(
        (category) => category.id === concept.categoryId,
      );
      return [
        concept.id,
        category
          ? { color: category.color, backgroundColor: category.backgroundColor }
          : undefined,
      ] as const;
    }),
  );
  return (
    <div className="tab-content editor-tab-content">
      <ConceptList
        items={data.concepts}
        renderContextMenu={(item) => (
          <Menu>
            <MenuItem
              text="上に複製する"
              onClick={() => duplicate(item.id, "above")}
            />
            <MenuItem
              text="下に複製する"
              onClick={() => duplicate(item.id, "below")}
            />
            <MenuDivider />
            <MenuItem
              text="削除する"
              intent="danger"
              onClick={() => remove("concept", item.id)}
            />
          </Menu>
        )}
        selectedId={selectedId}
        onSelect={onSelect}
        onAdd={add}
        scrollTopRef={scrollTopRef}
        itemStyles={itemStyles}
        onReorder={(items) =>
          onChange({
            ...data,
            concepts: items.map((item) =>
              data.concepts.find((concept) => concept.id === item.id)!,
            ),
          })
        }
      />
      <div className="editor-detail-pane">
        {selected ? (
          <ConceptEditor
            concept={selected}
            data={data}
            onChange={update}
            onDelete={() => remove("concept", selected.id)}
            onDeletePreset={(id) => remove("preset", id)}
            onDeleteGroup={(id) => remove("variantGroup", id)}
            onDeleteVariant={(id) => remove("variant", id)}
          />
        ) : (
          <div className="editor-empty-state">コンセプトを選択してください</div>
        )}
      </div>
    </div>
  );
}
