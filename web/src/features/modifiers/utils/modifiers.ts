import { formatPeso, type MenuBrand } from "@/src/features/menu/utils/menu";
import type { ModifierDetailRecord, ModifierListRecord, ModifierRecord } from "../schemas/modifierSchema";

/** One menu item that offers the modifier, with the price that item sets for it. */
export type ModifierUse = {
  /** The item-to-modifier link, not the item. */
  id: string;
  itemName: string;
  itemCode: string;
  brand: MenuBrand;
  /** Added to the item's line price; 0 for free changes like "Less sugar". */
  price: number;
  /** The item itself is still on the menu. */
  itemActive: boolean;
};

/** A row of the modifiers table: a shared add-on that any brand's items can offer. */
export type Modifier = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  /** Inactive modifiers are retired: no counter offers them, though items keep the link. */
  active: boolean;
  createdAt: string;
  modifiedAt: string;
  /** How many menu items offer it. */
  useCount: number;
};

export type StatusFilter = "active" | "inactive";
export type ModifierSortField = "name" | "code" | "created_at" | "modified_at";

export const MODIFIER_PAGE_SIZE = 10;

/** A list row, or a record from a write, which comes back without its usage. */
export function toModifier(record: ModifierListRecord | ModifierRecord, useCount?: number): Modifier {
  return {
    id: record.modifier_id,
    code: record.code,
    name: record.name,
    description: record.description,
    active: record.is_active,
    createdAt: record.created_at,
    modifiedAt: record.modified_at,
    useCount: useCount ?? ("_count" in record ? record._count.menu_item_modifiers_modifier : 0),
  };
}

export function toModifierUses(record: ModifierDetailRecord, brandFor: (id: string) => MenuBrand): ModifierUse[] {
  return record.menu_item_modifiers_modifier.map((use) => ({
    id: use.menu_item_modifier_id,
    itemName: use.menu_item.name,
    itemCode: use.menu_item.code,
    brand: brandFor(use.menu_item.brand_id),
    price: use.additional_price,
    itemActive: use.menu_item.is_active,
  }));
}

/** Uses grouped by brand in the page's brand order (unknown brands last), items by name within each. */
export function usesByBrand(uses: ModifierUse[], brands: MenuBrand[]) {
  const order = (brand: MenuBrand) => {
    const index = brands.findIndex((b) => b.id === brand.id);
    return index === -1 ? brands.length : index;
  };
  const groups = new Map<string, { brand: MenuBrand; uses: ModifierUse[] }>();
  for (const use of uses) {
    const group = groups.get(use.brand.id) ?? { brand: use.brand, uses: [] };
    group.uses.push(use);
    groups.set(use.brand.id, group);
  }
  return [...groups.values()]
    .sort((a, b) => order(a.brand) - order(b.brand))
    .map((group) => ({
      ...group,
      uses: group.uses.sort((a, b) => a.itemName.localeCompare(b.itemName)),
    }));
}

/** Free add-ons say so instead of "+₱0.00". */
export function formatUsePrice(price: number) {
  return price === 0 ? "Free" : `+${formatPeso(price)}`;
}

export function itemCount(count: number) {
  return `${count} ${count === 1 ? "item" : "items"}`;
}

const DATE = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  dateStyle: "medium",
});

export function formatDate(iso: string) {
  return DATE.format(new Date(iso));
}
