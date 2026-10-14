import { MenuItem } from "@blueprintjs/core";
import { Suggest, type ItemRenderer } from "@blueprintjs/select";
import { Data, Id } from "./data";
import { allPresets } from "./domain/presets";

export default function PresetSelect({
  presetId,
  data,
  onChange,
}: {
  presetId?: Id;
  data: Data;
  onChange: (id?: string) => void;
}) {
  const options = allPresets(data).map(({ concept, preset }) => ({
    id: preset.id,
    label: preset.name,
    category: data.categories.find((c) => c.id === concept.categoryId),
  }));
  const chosen = options.find((x) => x.id === presetId);
  type Item = (typeof options)[number] | { id: "__blank"; label: string };
  const blank: Item = { id: "__blank", label: "空白" };
  const items: Item[] = [blank, ...options];
  const render: ItemRenderer<Item> = (item, { modifiers, handleClick, ref }) =>
    !modifiers.matchesPredicate ? null : (
      <MenuItem
        ref={ref}
        text={item.id === "__blank" ? "␠ 空白" : item.label}
        active={modifiers.active}
        disabled={modifiers.disabled}
        onClick={handleClick}
        roleStructure="listoption"
        style={
          "category" in item
            ? {
                color: item.category?.color,
                backgroundColor: item.category?.backgroundColor,
              }
            : undefined
        }
      />
    );

  return (
    <Suggest<Item>
      items={items}
      selectedItem={chosen ?? blank}
      inputValueRenderer={(item) => item.label}
      itemPredicate={(q, item) =>
        item.label.toLocaleLowerCase().includes(q.toLocaleLowerCase())
      }
      itemRenderer={render}
      onItemSelect={(item) =>
        onChange(item.id === "__blank" ? undefined : item.id)
      }
      fill
      noResults={
        <MenuItem
          disabled
          text="該当する項目がありません"
          roleStructure="listoption"
        />
      }
      resetOnClose
      inputProps={{
        style: {
          color: chosen?.category?.color,
          backgroundColor: chosen?.category?.backgroundColor,
        },
      }}
      className="preset-suggest"
    />
  );
}
