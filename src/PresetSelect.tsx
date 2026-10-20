import { MenuItem } from "@blueprintjs/core";
import { Suggest, type ItemRenderer } from "@blueprintjs/select";
import type { ClipboardEvent } from "react";
import { Id } from "./data";
import { PresetOption } from "./domain/dataIndex";

export default function PresetSelect({
  presetId,
  options,
  onChange,
}: {
  presetId?: Id;
  options: PresetOption[];
  onChange: (id?: string) => void;
}) {
  const chosen = options.find((x) => x.id === presetId && x.id !== "__blank");
  const handleCopy = (event: ClipboardEvent<HTMLInputElement>) => {
    const { selectionStart, selectionEnd } = event.currentTarget;
    if (
      selectionStart !== null &&
      selectionEnd !== null &&
      selectionStart !== selectionEnd
    ) {
      return;
    }
    if (!chosen) return;

    event.preventDefault();
    event.clipboardData.setData("text/plain", chosen.label);
  };
  type Item = PresetOption;
  const blank = options[0];
  const items = options;
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
          item.id !== "__blank"
            ? {
                color: item.color,
                backgroundColor: item.backgroundColor,
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
        onCopy: handleCopy,
        style: {
          color: chosen?.color,
          backgroundColor: chosen?.backgroundColor,
        },
      }}
      className="preset-suggest"
    />
  );
}
