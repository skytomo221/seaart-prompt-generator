import { Button, MenuItem } from "@blueprintjs/core";
import { Suggest, type ItemRenderer } from "@blueprintjs/select";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, memo, createContext, useContext, useCallback } from "react";
import { DataIndex } from "./domain/dataIndex";
import { ConceptInstance, VariantGroup } from "./data";
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

interface InstanceProps {
  instance: ConceptInstance;
  dataIndex: DataIndex;
  onPresetChange: (instanceId: string, id?: string) => void;
  onVariantChange: (
    instanceId: string,
    groupId: string,
    variantId?: string,
  ) => void;
}
const InstanceDragContext =
  createContext<ReturnType<typeof useSortable>["listeners"]>(undefined);
function InstanceDragHandle() {
  const listeners = useContext(InstanceDragContext);
  return (
    <Button
      {...listeners}
      icon="drag-handle-vertical"
      variant="minimal"
      size="small"
      aria-label="ドラッグして並べ替え"
      style={{ flex: "0 0 auto", cursor: "grab" }}
    />
  );
}
export default function SortableInstance(props: InstanceProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props.instance.id,
    data: { type: "instance" },
  });
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
      <InstanceDragContext.Provider value={listeners}>
        <InstanceContent {...props} />
      </InstanceDragContext.Provider>
    </div>
  );
}
const InstanceContent = memo(function InstanceContent({
  instance,
  dataIndex,
  onPresetChange,
  onVariantChange,
}: InstanceProps) {
  const [expanded, setExpanded] = useState(false);
  const changePreset = useCallback(
    (id?: string) => {
      setExpanded(false);
      onPresetChange(instance.id, id);
    },
    [instance.id, onPresetChange],
  );
  const concept = instance.conceptId
    ? dataIndex.conceptById.get(instance.conceptId)
    : undefined;
  const hasVariants = (concept?.variantGroups.length ?? 0) > 0;

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          width: "100%",
        }}
      >
        <InstanceDragHandle />
        <div style={{ flex: "1 1 auto", minWidth: 0 }}>
          <PresetSelect
            presetId={instance.presetId}
            options={dataIndex.presetOptions}
            onChange={changePreset}
          />
        </div>
        {hasVariants && (
          <Button
            icon={expanded ? "chevron-up" : "chevron-down"}
            variant="minimal"
            size="small"
            aria-label={expanded ? "Variant詳細を閉じる" : "Variant詳細を開く"}
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
            style={{ flex: "0 0 auto" }}
          />
        )}
      </div>
      {hasVariants &&
        expanded &&
        concept?.variantGroups.map((group) => {
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
                onChange={(variantId) =>
                  onVariantChange(instance.id, group.id, variantId)
                }
              />
            </div>
          );
        })}
    </>
  );
});
