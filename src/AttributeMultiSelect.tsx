import { MenuItem } from "@blueprintjs/core";
import { MultiSelect } from "@blueprintjs/select";
import { Attribute, Id } from "./data";

interface Props {
  attributes: Attribute[];
  selectedIds: Id[];
  onChange(ids: Id[]): void;
  placeholder?: string;
  excludeId?: Id;
}

export default function AttributeMultiSelect({
  attributes,
  selectedIds,
  onChange,
  placeholder = "属性を検索...",
  excludeId,
}: Props) {
  const options = attributes.filter((attribute) => attribute.id !== excludeId);
  const selected = options.filter((attribute) =>
    selectedIds.includes(attribute.id),
  );
  return (
    <MultiSelect<Attribute>
      items={options}
      selectedItems={selected}
      itemsEqual="id"
      itemDisabled={(attribute) => selectedIds.includes(attribute.id)}
      itemPredicate={(query, attribute) =>
        attribute.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())
      }
      itemRenderer={(attribute, { handleClick, modifiers, ref }) =>
        modifiers.matchesPredicate ? (
          <MenuItem
            key={attribute.id}
            ref={ref}
            text={attribute.name}
            icon={selectedIds.includes(attribute.id) ? "tick" : undefined}
            active={modifiers.active}
            disabled={modifiers.disabled}
            onClick={handleClick}
            roleStructure="listoption"
          />
        ) : null
      }
      tagRenderer={(attribute) => attribute.name}
      onItemSelect={(attribute) => {
        if (!selectedIds.includes(attribute.id))
          onChange([...selectedIds, attribute.id]);
      }}
      onRemove={(attribute) =>
        onChange(selectedIds.filter((id) => id !== attribute.id))
      }
      placeholder={placeholder}
      noResults={<MenuItem disabled text="該当する属性がありません" />}
      fill
      popoverProps={{ minimal: true, matchTargetWidth: true }}
    />
  );
}
