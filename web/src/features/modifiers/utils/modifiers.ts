import { formatPeso, type MenuBrand } from "@/src/features/menu/utils/menu";

/** One menu item that offers the modifier, with the price and stock that item sets for it. */
export type ModifierUse = {
  /** The item-to-modifier link, not the item. */
  id: string;
  itemName: string;
  itemCode: string;
  brand: MenuBrand;
  /** Added to the item's line price; 0 for free changes like "Less sugar". */
  price: number;
  /** Off when this item has run out of the add-on. */
  available: boolean;
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
  uses: ModifierUse[];
};

export type StatusFilter = "active" | "inactive";

export type ModifierFilters = {
  search: string;
  /** Brand code; undefined means every brand. */
  brand: string | undefined;
  /** Undefined means active and inactive. */
  status: StatusFilter | undefined;
};

/** Counts per brand code plus "all", in the shape the brand chips take. */
export type ModifierBrandCounts = Record<string, { total: number; unavailable: number }>;

export const MODIFIER_PAGE_SIZE = 10;

// Same rule as the menu: every space-separated term must match the name or the code.
function matchesSearch(modifier: Modifier, search: string) {
  const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = [modifier.name.toLowerCase(), modifier.code.toLowerCase()];
  return terms.every((term) => haystack.some((field) => field.includes(term)));
}

function matchesStatus(modifier: Modifier, status: StatusFilter | undefined) {
  if (!status) return true;
  return status === "active" ? modifier.active : !modifier.active;
}

function offeredBy(modifier: Modifier, brandCode: string) {
  return modifier.uses.some((use) => use.brand.code === brandCode);
}

/** The rows the table shows, in name order. */
export function filterModifiers(modifiers: Modifier[], filters: ModifierFilters) {
  return modifiers
    .filter(
      (modifier) =>
        matchesSearch(modifier, filters.search) &&
        matchesStatus(modifier, filters.status) &&
        (!filters.brand || offeredBy(modifier, filters.brand)),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * What each brand chip would show if picked. Ignores the brand filter itself.
 * A modifier offered by two brands counts once under each.
 */
export function countModifiers(modifiers: Modifier[], filters: ModifierFilters): ModifierBrandCounts {
  const counts: ModifierBrandCounts = { all: { total: 0, unavailable: 0 } };
  for (const modifier of modifiers) {
    if (!matchesSearch(modifier, filters.search) || !matchesStatus(modifier, filters.status)) continue;
    counts.all.total += 1;
    for (const code of new Set(modifier.uses.map((use) => use.brand.code))) {
      (counts[code] ??= { total: 0, unavailable: 0 }).total += 1;
    }
  }
  return counts;
}

/** The brands whose items offer the modifier, in the page's brand order. */
export function brandsOf(modifier: Modifier, brands: MenuBrand[]): MenuBrand[] {
  return brands.filter((brand) => offeredBy(modifier, brand.code));
}

/** Uses grouped by brand in the page's brand order, items by name within each. */
export function usesByBrand(modifier: Modifier, brands: MenuBrand[]) {
  return brandsOf(modifier, brands).map((brand) => ({
    brand,
    uses: modifier.uses
      .filter((use) => use.brand.code === brand.code)
      .sort((a, b) => a.itemName.localeCompare(b.itemName)),
  }));
}

/** Free add-ons say so instead of "+₱0.00". */
export function formatUsePrice(price: number) {
  return price === 0 ? "Free" : `+${formatPeso(price)}`;
}

export function itemCount(count: number) {
  return `${count} ${count === 1 ? "item" : "items"}`;
}

const DATE = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium" });

export function formatDate(iso: string) {
  return DATE.format(new Date(iso));
}
