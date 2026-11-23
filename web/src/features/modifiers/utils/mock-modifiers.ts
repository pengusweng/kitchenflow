// Placeholder data until the page is wired to the modifiers API. Records use
// the API's snake_case shape so wiring it up only swaps the data source; the
// page itself only ever sees `toModifier` output.
//
// The catalog is read off the menu mock's items, so both pages agree on which
// modifiers exist and where they're offered. Edits made here stay on this page.
import type { MenuBrand } from "@/src/features/menu/utils/menu";
import { MOCK_BRANDS, MOCK_MENU_ITEMS, type MenuItemRecord } from "@/src/features/menu/utils/mock-menu";
import type { Modifier, ModifierUse } from "./modifiers";

export type ModifierRecord = {
  modifier_id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  modified_at: string;
};

// In the catalog but on no menu item yet.
const UNUSED: Omit<ModifierRecord, "created_at" | "modified_at">[] = [
  { modifier_id: "mod-no-onions", code: "NO-ONIONS", name: "No onions", description: null, is_active: true },
  {
    modifier_id: "mod-kimchi-side",
    code: "KIMCHI-SIDE",
    name: "Extra kimchi side",
    description: "Small dish of house kimchi.",
    is_active: false,
  },
];

// Spread the made-up timestamps over a few months so the dates differ.
function stamp(index: number) {
  const created = Date.UTC(2026, 5, 2) + index * 6 * 86_400_000;
  const modified = created + ((index * 7) % 40) * 86_400_000;
  return { created_at: new Date(created).toISOString(), modified_at: new Date(modified).toISOString() };
}

function catalogFrom(items: MenuItemRecord[]): ModifierRecord[] {
  const byCode = new Map<string, Omit<ModifierRecord, "created_at" | "modified_at">>();
  for (const item of items) {
    for (const link of item.menu_item_modifiers) byCode.set(link.modifier.code, link.modifier);
  }
  for (const record of UNUSED) byCode.set(record.code, record);
  return [...byCode.values()].map((record, i) => ({ ...record, ...stamp(i) }));
}

export const MOCK_MODIFIERS: ModifierRecord[] = catalogFrom(MOCK_MENU_ITEMS);

/** Every menu item that offers the modifier, with that item's price for it. */
function usesOf(code: string, items: MenuItemRecord[], brands: MenuBrand[]): ModifierUse[] {
  return items.flatMap((item) => {
    const link = item.menu_item_modifiers.find((m) => m.modifier.code === code);
    const brand = brands.find((b) => b.id === item.brand_id);
    if (!link || !brand) return [];
    return [
      {
        id: link.menu_item_modifier_id,
        itemName: item.name,
        itemCode: item.code,
        brand,
        price: Number(link.additional_price),
        available: link.is_available,
        itemActive: item.is_active,
      },
    ];
  });
}

export function toModifier(
  record: ModifierRecord,
  items: MenuItemRecord[] = MOCK_MENU_ITEMS,
  brands: MenuBrand[] = MOCK_BRANDS,
): Modifier {
  return {
    id: record.modifier_id,
    code: record.code,
    name: record.name,
    description: record.description,
    active: record.is_active,
    createdAt: record.created_at,
    modifiedAt: record.modified_at,
    uses: usesOf(record.code, items, brands),
  };
}
