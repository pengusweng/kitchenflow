import { describe, expect, test } from "vitest";
import { countMenuItems, filterMenuItems, type MenuBrand, type MenuFilters, type MenuItem } from "./menu";

const GC: MenuBrand = { id: "b-gc", code: "GC", name: "Gamcheon", accent: "#3D5A80" };
const AI: MenuBrand = { id: "b-ai", code: "AI", name: "Aurelia's Inasal", accent: "#9A4A1F" };
const ORDER = ["GC", "AI"];

function item(code: string, name: string, brand: MenuBrand, overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: code,
    code,
    name,
    brand,
    description: null,
    servingDescription: null,
    recipe: name,
    imageUrl: null,
    basePrice: 100,
    available: true,
    active: true,
    channels: [],
    modifiers: [],
    ...overrides,
  };
}

const ITEMS = [
  item("AI-PECHO", "Chicken Inasal Pecho", AI, { available: false }),
  item("GC-SOY", "Soy Garlic Chicken", GC, { available: false }),
  item("GC-KIMCHI", "Kimchi Fried Rice", GC),
  item("AI-RICE", "Garlic Rice", AI),
  item("GC-SET", "Samgyeopsal Set", GC, { active: false }),
];

const NONE: MenuFilters = { search: "", brand: undefined, availability: "all", active: "active" };

describe("filterMenuItems", () => {
  test("lists every brand's active items, in brand then name order", () => {
    expect(filterMenuItems(ITEMS, NONE, ORDER).map((i) => i.code)).toEqual([
      "GC-KIMCHI",
      "GC-SOY",
      "AI-PECHO",
      "AI-RICE",
    ]);
  });

  test("narrows to one brand and one availability state", () => {
    const rows = filterMenuItems(ITEMS, { ...NONE, availability: "unavailable" }, ORDER);
    expect(rows.map((i) => i.code)).toEqual(["GC-SOY", "AI-PECHO"]);
    const gc = filterMenuItems(ITEMS, { ...NONE, brand: "GC", availability: "unavailable" }, ORDER);
    expect(gc.map((i) => i.code)).toEqual(["GC-SOY"]);
  });

  test("needs every search term to match the name or the code", () => {
    expect(filterMenuItems(ITEMS, { ...NONE, search: "chicken ai" }, ORDER).map((i) => i.code)).toEqual(["AI-PECHO"]);
    expect(filterMenuItems(ITEMS, { ...NONE, search: "gc-kim" }, ORDER).map((i) => i.code)).toEqual(["GC-KIMCHI"]);
  });

  test("shows inactive items only when asked", () => {
    expect(filterMenuItems(ITEMS, { ...NONE, active: "inactive" }, ORDER).map((i) => i.code)).toEqual(["GC-SET"]);
    expect(filterMenuItems(ITEMS, { ...NONE, active: undefined }, ORDER)).toHaveLength(5);
  });
});

describe("countMenuItems", () => {
  test("counts brands across the board, whatever brand is picked", () => {
    const { brands } = countMenuItems(ITEMS, { ...NONE, brand: "GC", availability: "available" });
    expect(brands).toEqual({
      all: { total: 4, unavailable: 2 },
      GC: { total: 2, unavailable: 1 },
      AI: { total: 2, unavailable: 1 },
    });
  });

  test("counts availability within the picked brand, ignoring the availability filter", () => {
    const { availability } = countMenuItems(ITEMS, { ...NONE, brand: "AI", availability: "unavailable" });
    expect(availability).toEqual({ all: 2, available: 1, unavailable: 1 });
  });

  test("respects the search", () => {
    const { brands, availability } = countMenuItems(ITEMS, { ...NONE, search: "rice" });
    expect(brands.all).toEqual({ total: 2, unavailable: 0 });
    expect(availability).toEqual({ all: 2, available: 2, unavailable: 0 });
  });
});
