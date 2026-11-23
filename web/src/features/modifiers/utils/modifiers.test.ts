import { describe, expect, test } from "vitest";
import type { MenuBrand } from "@/src/features/menu/utils/menu";
import {
  countModifiers,
  filterModifiers,
  formatUsePrice,
  usesByBrand,
  type Modifier,
  type ModifierFilters,
  type ModifierUse,
} from "./modifiers";

const GC: MenuBrand = { id: "b-gc", code: "GC", name: "Gamcheon", accent: "#3D5A80" };
const AI: MenuBrand = { id: "b-ai", code: "AI", name: "Aurelia's Inasal", accent: "#9A4A1F" };
const BRANDS = [GC, AI];

function offeredOn(itemName: string, brand: MenuBrand): ModifierUse {
  return { id: `${brand.code}-${itemName}`, itemName, itemCode: itemName, brand, price: 0, available: true, itemActive: true };
}

function modifier(code: string, name: string, uses: ModifierUse[], overrides: Partial<Modifier> = {}): Modifier {
  return {
    id: code,
    code,
    name,
    description: null,
    active: true,
    createdAt: "2026-06-02T00:00:00.000Z",
    modifiedAt: "2026-06-02T00:00:00.000Z",
    uses,
    ...overrides,
  };
}

const MODIFIERS = [
  modifier("EXTRA-RICE", "Extra rice", [offeredOn("Bibimbap", GC), offeredOn("Paa", AI), offeredOn("Pecho", AI)]),
  modifier("FRIED-EGG", "Fried egg", [offeredOn("Bibimbap", GC)]),
  modifier("ATCHARA", "Atchara side", [offeredOn("Paa", AI)]),
  modifier("NO-ONIONS", "No onions", []),
  modifier("CARAMEL", "Caramel drizzle", [offeredOn("Latte", GC)], { active: false }),
];

const NONE: ModifierFilters = { search: "", brand: undefined, status: "active" };
const codes = (list: Modifier[]) => list.map((m) => m.code);

describe("filterModifiers", () => {
  test("lists active modifiers in name order", () => {
    expect(codes(filterModifiers(MODIFIERS, NONE))).toEqual(["ATCHARA", "EXTRA-RICE", "FRIED-EGG", "NO-ONIONS"]);
  });

  test("an undefined status shows inactive ones too", () => {
    expect(filterModifiers(MODIFIERS, { ...NONE, status: undefined })).toHaveLength(5);
    expect(codes(filterModifiers(MODIFIERS, { ...NONE, status: "inactive" }))).toEqual(["CARAMEL"]);
  });

  test("a brand keeps the modifiers any of its items offer", () => {
    expect(codes(filterModifiers(MODIFIERS, { ...NONE, brand: "AI" }))).toEqual(["ATCHARA", "EXTRA-RICE"]);
  });

  test("every search term must match the name or the code", () => {
    expect(codes(filterModifiers(MODIFIERS, { ...NONE, search: "extra rice" }))).toEqual(["EXTRA-RICE"]);
    expect(codes(filterModifiers(MODIFIERS, { ...NONE, search: "no-on" }))).toEqual(["NO-ONIONS"]);
    expect(filterModifiers(MODIFIERS, { ...NONE, search: "rice egg" })).toEqual([]);
  });
});

describe("countModifiers", () => {
  test("counts each modifier once per brand that offers it, ignoring the brand filter", () => {
    const counts = countModifiers(MODIFIERS, { ...NONE, brand: "GC" });
    expect(counts.all.total).toBe(4);
    expect(counts.GC.total).toBe(2);
    expect(counts.AI.total).toBe(2);
  });

  test("follows the search and status filters", () => {
    const counts = countModifiers(MODIFIERS, { ...NONE, status: "inactive" });
    expect(counts.all.total).toBe(1);
    expect(counts.GC.total).toBe(1);
    expect(counts.AI).toBeUndefined();
  });
});

describe("usesByBrand", () => {
  test("groups in brand order, items by name", () => {
    const groups = usesByBrand(MODIFIERS[0], [AI, GC]);
    expect(groups.map((g) => g.brand.code)).toEqual(["AI", "GC"]);
    expect(groups[0].uses.map((u) => u.itemName)).toEqual(["Paa", "Pecho"]);
  });

  test("leaves out brands that don't offer it", () => {
    expect(usesByBrand(MODIFIERS[2], BRANDS).map((g) => g.brand.code)).toEqual(["AI"]);
    expect(usesByBrand(MODIFIERS[3], BRANDS)).toEqual([]);
  });
});

test("formatUsePrice says Free instead of +₱0.00", () => {
  expect(formatUsePrice(0)).toBe("Free");
  expect(formatUsePrice(35)).toMatch(/^\+₱\s?35\.00$/);
});
