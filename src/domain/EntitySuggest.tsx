import { MenuItem } from "@blueprintjs/core";
import { Suggest } from "@blueprintjs/select";

export interface EntityOption { id: string; label: string; searchText?: string }
interface Props<T extends EntityOption> {
  items: T[];
  selectedId?: string;
  onChange(id?: string): void;
  placeholder: string;
}

export default function EntitySuggest<T extends EntityOption>({ items, selectedId, onChange, placeholder }: Props<T>) {
  const selected = items.find(item => item.id === selectedId) ?? null;
  return <Suggest<T>
    items={items}
    selectedItem={selected}
    inputValueRenderer={item => item.label}
    itemPredicate={(query, item) => `${item.label} ${item.searchText ?? ""}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())}
    itemRenderer={(item, { handleClick, modifiers, ref }) => modifiers.matchesPredicate
      ? <MenuItem key={item.id} ref={ref} text={item.label} active={modifiers.active} disabled={modifiers.disabled} onClick={handleClick} roleStructure="listoption" />
      : null}
    onItemSelect={item => onChange(item.id)}
    inputProps={{ placeholder, "aria-label": placeholder }}
    noResults={<MenuItem disabled text="候補がありません" />}
    fill
    popoverProps={{ minimal: true, matchTargetWidth: true }}
  />;
}
