import { describe, expect, test } from "vitest";
import type { MenuEntryRecord, MenuPage } from "../schemas/menuSchema";
import { patchAvailability, toMenuItem, type MenuBrand } from "./menu";

const GC: MenuBrand = {
  id: "b-gc",
  code: "GC",
  name: "Gamcheon",
  accent: "#3D5A80",
};

const RECORD: MenuEntryRecord = {
  menu_item_id: "mi-1",
  brand_id: "b-gc",
  code: "GC-KIMCHI-RICE",
  name: "Kimchi Fried Rice",
  description: null,
  serving_description: "1 bowl",
  img_url: "https://files.example.test/photo.jpg",
  base_price: 189.5,
  is_available: true,
  is_active: true,
  recipe: {
    recipe_id: "r-kimchi",
    name: "Kimchi Fried Rice",
    is_active: false,
  },
  menuChannels: [
    {
      menu_item_channel_id: "c-1",
      order_channel: "GRABFOOD",
      price: 219,
      is_available: true,
    },
    {
      menu_item_channel_id: "c-2",
      order_channel: "FOODPANDA",
      price: 189.5,
      is_available: false,
    },
  ],
  menuItemModifiers: [
    {
      menu_item_modifier_id: "mim-rice",
      modifier_id: "m-rice",
      additional_price: 35,
      modifier: {
        modifier_id: "m-rice",
        code: "EXTRA-RICE",
        name: "Extra rice",
        description: null,
        is_active: false,
      },
    },
  ],
};

describe("toMenuItem", () => {
  const item = toMenuItem(RECORD, () => GC);

  test("lists every channel at the base price unless a delivery channel overrides it", () => {
    expect(item.channels).toEqual([
      { channel: "DINE_IN", price: 189.5, available: true, overrideId: null },
      { channel: "TAKEAWAY", price: 189.5, available: true, overrideId: null },
      { channel: "GRABFOOD", price: 219, available: true, overrideId: "c-1" },
      { channel: "FOODPANDA", price: 189.5, available: false, overrideId: "c-2" },
    ]);
  });

  test("keeps the recipe and each modifier's link, price and whether it can still be ordered", () => {
    expect(item.recipe).toEqual({
      id: "r-kimchi",
      name: "Kimchi Fried Rice",
      active: false,
    });
    expect(item.modifiers).toEqual([
      {
        id: "mim-rice",
        modifierId: "m-rice",
        code: "EXTRA-RICE",
        name: "Extra rice",
        description: null,
        price: 35,
        available: false,
      },
    ]);
  });

  test("names the brand and reads the photo URL", () => {
    expect(item.brand).toBe(GC);
    expect(item.imageUrl).toBe(RECORD.img_url);
    expect(toMenuItem({ ...RECORD, img_url: "" }, () => GC).imageUrl).toBeNull();
  });
});

describe("patchAvailability", () => {
  const page: MenuPage = {
    data: [RECORD, { ...RECORD, menu_item_id: "mi-2" }],
    meta: {
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
      counts: {
        brands: {
          all: { total: 5, unavailable: 1 },
          "b-gc": { total: 3, unavailable: 0 },
        },
        availability: { all: 3, available: 3, unavailable: 0 },
      },
    },
  };

  test("flips the item in place and moves its counts", () => {
    const next = patchAvailability(page, "mi-1", false);
    expect(next.data.map((r) => r.is_available)).toEqual([false, true]);
    expect(next.meta.total).toBe(2);
    expect(next.meta.counts).toEqual({
      brands: {
        all: { total: 5, unavailable: 2 },
        "b-gc": { total: 3, unavailable: 1 },
      },
      availability: { all: 3, available: 2, unavailable: 1 },
    });
  });

  test("leaves a page alone when it doesn't show the item or nothing changes", () => {
    expect(patchAvailability(page, "mi-9", false)).toBe(page);
    expect(patchAvailability(page, "mi-1", true)).toBe(page);
  });
});
