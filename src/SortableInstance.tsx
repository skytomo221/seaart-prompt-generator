import { Button, MenuItem } from "@blueprintjs/core";
import { Suggest, type ItemRenderer } from "@blueprintjs/select";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ConceptInstance, Data, VariantGroup } from "./data";
import PresetSelect from "./PresetSelect";

function VariantSelect({
  group,
  selectedId,
  onChange,
}: {
  group: VariantGroup;
  selectedId?: string;
  onChange: (id?: string) => void;
}) {
  type Item =
    | VariantGroup["variants"][number]
    | { id: "__blank"; name: string; attributeIds: [] };
  const blank: Item = { id: "__blank", name: "未選択", attributeIds: [] };
  const items: Item[] = [blank, ...group.variants];
  const selected = group.variants.find((variant) => variant.id === selectedId);
  const render: ItemRenderer<Item> = (item, { modifiers, handleClick, ref }) =>
    !modifiers.matchesPredicate ? null : (
      <MenuItem
        ref={ref}
        text={item.name}
        active={modifiers.active}
        disabled={modifiers.disabled}
        onClick={handleClick}
        roleStructure="listoption"
      />
    );

  return (
    <div style={{ flex: "1 1 auto", minWidth: 0 }}>
      <Suggest<Item>
        items={items}
        selectedItem={selected ?? blank}
        inputValueRenderer={(item) => item.name}
        itemPredicate={(query, item) =>
          item.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())
        }
        itemRenderer={render}
        onItemSelect={(item) =>
          onChange(item.id === "__blank" ? undefined : item.id)
        }
        fill
        resetOnClose
        noResults={
          <MenuItem
            disabled
            text="該当する項目がありません"
            roleStructure="listoption"
          />
        }
      />
    </div>
  );
}

export default function SortableInstance({
  instance,
  data,
  onPresetChange,
  onVariantChange,
}: {
  instance: ConceptInstance;
  data: Data;
  onPresetChange: (id?: string) => void;
  onVariantChange: (groupId: string, variantId?: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: instance.id,
    data: { type: "instance" },
  });
  const concept = instance.conceptId
    ? data.concepts.find((item) => item.id === instance.conceptId)
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: isDragging ? undefined : CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        width: "100%",
      }}
      {...attributes}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          width: "100%",
        }}
      >
        <Button
          {...listeners}
          icon="drag-handle-vertical"
          variant="minimal"
          size="small"
          aria-label="ドラッグして並べ替え"
          style={{ flex: "0 0 auto", cursor: "grab" }}
        />
        <div style={{ flex: "1 1 auto", minWidth: 0 }}>
          <PresetSelect
            presetId={instance.presetId}
            data={data}
            onChange={onPresetChange}
          />
        </div>
      </div>
      {concept?.variantGroups.map((group) => {
        const selectedId = instance.variantSelections.find(
          (selection) => selection.groupId === group.id,
        )?.variantId;
        return (
          <div
            key={group.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              paddingLeft: 34,
              width: "100%",
            }}
          >
            <span style={{ flex: "0 0 auto" }}>{group.name}：</span>
            <VariantSelect
              group={group}
              selectedId={selectedId}
              onChange={(variantId) => onVariantChange(group.id, variantId)}
            />
          </div>
        );
      })}
    </div>
  );
}
