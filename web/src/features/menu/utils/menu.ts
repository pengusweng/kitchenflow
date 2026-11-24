import type { MenuEntryRecord, MenuPage } from "../schemas/menuSchema";

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

/** Delivery platforms can sell an item at their own price or not at all; the counter always uses the base price. */
export type DeliveryChannel = "GRABFOOD" | "FOODPANDA";
export const DELIVERY_CHANNELS: DeliveryChannel[] = ["GRABFOOD", "FOODPANDA"];

export type MenuItemChannel = {
  channel: Channel;
  price: number;
  available: boolean;
  /** The delivery channel's own setting, when it has one; null means it follows the base price. */
  overrideId: string | null;
};

/** An add-on or change the counter can apply to this item, e.g. "Extra rice". */
export type MenuItemModifier = {
  /** The item's own link to the modifier. */
  id: string;
  modifierId: string;
  code: string;
  name: string;
  description: string | null;
  /** Added to the line price; 0 for free changes like "Less ice". */
  price: number;
  /** Off once the modifier is retired; the counter can't add it then. */
  available: boolean;
};

/** A modifier from the shared catalog, before it's attached to an item. */
export type MenuModifierOption = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

export type MenuRecipe = {
  id: string;
  name: string;
  /** An inactive recipe stops the item being ordered. */
  active: boolean;
};

/** A row of the menu table. */
export type MenuItem = {
  id: string;
  code: string;
  name: string;
  brand: MenuBrand;
  description: string | null;
  servingDescription: string | null;
  recipe: MenuRecipe;
  imageUrl: string | null;
  basePrice: number;
  /** Can be ordered right now. Flipped by kitchen and floor staff during service. */
  available: boolean;
  /** Still on the menu. Inactive items are archived, not just sold out. */
  active: boolean;
  /** Every channel, in CHANNELS order. */
  channels: MenuItemChannel[];
  modifiers: MenuItemModifier[];
};

export type AvailabilityFilter = "all" | "available" | "unavailable";
export type ActiveFilter = "active" | "inactive";

export const MENU_PAGE_SIZE = 20;

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

export function formatPeso(amount: number) {
  return peso.format(amount);
}

export type MenuCounts = {
  /** Items per brand id, plus "all". Ignores the brand and availability filters. */
  brands: Record<string, { total: number; unavailable: number }>;
  /** Ignores the availability filter, so each chip says what picking it would show. */
  availability: Record<AvailabilityFilter, number>;
};

export const NO_COUNTS: MenuCounts = {
  brands: {},
  availability: { all: 0, available: 0, unavailable: 0 },
};

/**
 * An API row as the page shows it. Every channel sells at the base price
 * unless a delivery channel has its own price or is switched off; the counter
 * channels always use the base price.
 */
export function toMenuItem(record: MenuEntryRecord, brandFor: (id: string) => MenuBrand): MenuItem {
  return {
    id: record.menu_item_id,
    code: record.code,
    name: record.name,
    brand: brandFor(record.brand_id),
    description: record.description,
    servingDescription: record.serving_description,
    recipe: {
      id: record.recipe.recipe_id,
      name: record.recipe.name,
      active: record.recipe.is_active,
    },
    imageUrl: record.img_url || null,
    basePrice: record.base_price,
    available: record.is_available,
    active: record.is_active,
    channels: CHANNELS.map((channel) => {
      const override = record.menuChannels.find((c) => c.order_channel === channel);
      return {
        channel,
        price: override?.price ?? record.base_price,
        available: override?.is_available ?? true,
        overrideId: override?.menu_item_channel_id ?? null,
      };
    }),
    modifiers: record.menuItemModifiers.map((m) => ({
      id: m.menu_item_modifier_id,
      modifierId: m.modifier_id,
      code: m.modifier.code,
      name: m.modifier.name,
      description: m.modifier.description,
      price: m.additional_price,
      available: m.modifier.is_active,
    })),
  };
}

/**
 * Flips one item on a cached page that shows it, and moves its count
 * between "available" and "unavailable". Rows stay where they are even when
 * the availability filter no longer matches, so a row doesn't vanish from
 * under the pointer; the next filter or page change shows the true list.
 */
export function patchAvailability(page: MenuPage, itemId: string, available: boolean): MenuPage {
  const row = page.data.find((r) => r.menu_item_id === itemId);
  if (!row || row.is_available === available) return page;
  const step = available ? -1 : 1; // change in "unavailable"
  const brands = { ...page.meta.counts.brands };
  for (const key of ["all", row.brand_id]) {
    const count = brands[key];
    if (count) brands[key] = { ...count, unavailable: count.unavailable + step };
  }
  const { availability } = page.meta.counts;
  return {
    data: page.data.map((r) => (r === row ? { ...r, is_available: available } : r)),
    meta: {
      ...page.meta,
      counts: {
        brands,
        availability: {
          ...availability,
          available: availability.available - step,
          unavailable: availability.unavailable + step,
        },
      },
    },
  };
}
