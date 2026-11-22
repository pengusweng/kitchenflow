export type Channel = "DINE_IN" | "TAKEAWAY" | "GRABFOOD" | "FOODPANDA";

/** Counter channels first, then the delivery platforms. */
export const CHANNELS: Channel[] = ["DINE_IN", "TAKEAWAY", "GRABFOOD", "FOODPANDA"];

export const CHANNEL_LABEL: Record<Channel, string> = {
  DINE_IN: "Dine-in",
  TAKEAWAY: "Takeaway",
  GRABFOOD: "GrabFood",
  FOODPANDA: "foodpanda",
};

/** Two-letter tags for the table, where four full names don't fit. */
export const CHANNEL_SHORT: Record<Channel, string> = {
  DINE_IN: "DI",
  TAKEAWAY: "TA",
  GRABFOOD: "GF",
  FOODPANDA: "FP",
};

export type MenuBrand = {
  id: string;
  code: string;
  name: string;
  /** Brand accent, used for the swatch and the image fallback tile. */
  accent: string;
};

export type MenuItemChannel = {
  channel: Channel;
  price: number;
  available: boolean;
};

/** An add-on or change the counter can apply to this item, e.g. "Extra rice". */
export type MenuItemModifier = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  /** Added to the line price; 0 for free changes like "Less ice". */
  price: number;
  /** Off when the item is fine but this add-on has run out. */
  available: boolean;
};

/** A row of the menu table. */
export type MenuItem = {
  id: string;
  code: string;
  name: string;
  brand: MenuBrand;
  description: string | null;
  servingDescription: string | null;
  recipe: string;
  imageUrl: string | null;
  basePrice: number;
  /** Can be ordered right now. Flipped by kitchen and floor staff during service. */
  available: boolean;
  /** Still on the menu. Inactive items are archived, not just sold out. */
  active: boolean;
  channels: MenuItemChannel[];
  modifiers: MenuItemModifier[];
};

export type AvailabilityFilter = "all" | "available" | "unavailable";
export type ActiveFilter = "active" | "inactive";

export type MenuFilters = {
  search: string;
  /** Brand code; undefined means every brand. */
  brand: string | undefined;
  availability: AvailabilityFilter;
  /** Undefined means active and inactive. */
  active: ActiveFilter | undefined;
};

export const MENU_PAGE_SIZE = 20;

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export function formatPeso(amount: number) {
  return peso.format(amount);
}

// Same rule as the API: every space-separated term must match the name or the code.
function matchesSearch(item: MenuItem, search: string) {
  const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = [item.name.toLowerCase(), item.code.toLowerCase()];
  return terms.every((term) => haystack.some((field) => field.includes(term)));
}

function matchesActive(item: MenuItem, active: ActiveFilter | undefined) {
  if (!active) return true;
  return active === "active" ? item.active : !item.active;
}

export function matchesAvailability(item: MenuItem, availability: AvailabilityFilter) {
  if (availability === "all") return true;
  return availability === "available" ? item.available : !item.available;
}

/** The rows the table shows, in brand then name order. */
export function filterMenuItems(items: MenuItem[], filters: MenuFilters, brandOrder: string[]) {
  return items
    .filter(
      (item) =>
        matchesSearch(item, filters.search) &&
        matchesActive(item, filters.active) &&
        (!filters.brand || item.brand.code === filters.brand) &&
        matchesAvailability(item, filters.availability),
    )
    .sort(
      (a, b) =>
        brandOrder.indexOf(a.brand.code) - brandOrder.indexOf(b.brand.code) || a.name.localeCompare(b.name),
    );
}

export type MenuCounts = {
  /** Items per brand code, plus "all". Ignores the brand and availability filters. */
  brands: Record<string, { total: number; unavailable: number }>;
  /** Ignores the availability filter, so each chip says what picking it would show. */
  availability: Record<AvailabilityFilter, number>;
};

export function countMenuItems(items: MenuItem[], filters: MenuFilters): MenuCounts {
  const pool = items.filter((item) => matchesSearch(item, filters.search) && matchesActive(item, filters.active));

  const brands: MenuCounts["brands"] = { all: { total: 0, unavailable: 0 } };
  const availability: MenuCounts["availability"] = { all: 0, available: 0, unavailable: 0 };

  for (const item of pool) {
    const entry = (brands[item.brand.code] ??= { total: 0, unavailable: 0 });
    for (const bucket of [entry, brands.all]) {
      bucket.total += 1;
      if (!item.available) bucket.unavailable += 1;
    }
    if (filters.brand && item.brand.code !== filters.brand) continue;
    availability.all += 1;
    availability[item.available ? "available" : "unavailable"] += 1;
  }

  return { brands, availability };
}
