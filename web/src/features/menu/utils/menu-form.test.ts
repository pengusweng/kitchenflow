import { describe, expect, test } from "vitest";
import type { MenuItem } from "./menu";
import {
  applyMenuItemEdit,
  emptyFormValues,
  newMenuItem,
  suggestCode,
  validateNewMenuItem,
  hasFormChanges,
  newModifierDraft,
  parsePrice,
  toFormValues,
  validateMenuItemForm,
} from "./menu-form";

const ITEM: MenuItem = {
  id: "mi-1",
  code: "GC-KIMCHI-RICE",
  name: "Kimchi Fried Rice",
  brand: { id: "b-gc", code: "GC", name: "Gamcheon", accent: "#3D5A80" },
  description: null,
  servingDescription: "1 bowl",
  recipe: "Kimchi Fried Rice",
  imageUrl: null,
  basePrice: 189.5,
  available: true,
  active: true,
  channels: [],
  modifiers: [
    { id: "m-rice", code: "EXTRA-RICE", name: "Extra rice", description: null, price: 35, available: true },
    { id: "m-egg", code: "FRIED-EGG", name: "Fried egg", description: null, price: 25, available: false },
  ],
};

const CHEESE = { id: "mod-cheese", code: "ADD-CHEESE", name: "Add cheese", description: null, price: 45 };
const NO_CODES = new Set<string>();

describe("parsePrice", () => {
  test("takes whole pesos and up to two decimals", () => {
    expect(parsePrice("189")).toBe(189);
    expect(parsePrice(" 189.50 ")).toBe(189.5);
    expect(parsePrice("1,250")).toBe(1250);
  });

  test("rejects anything else", () => {
    expect(parsePrice("")).toBeNull();
    expect(parsePrice("-5")).toBeNull();
    expect(parsePrice("1.234")).toBeNull();
    expect(parsePrice("abc")).toBeNull();
  });
});

describe("hasFormChanges", () => {
  test("an untouched form has no changes", () => {
    expect(hasFormChanges(ITEM, toFormValues(ITEM), false)).toBe(false);
  });

  test("removing, adding or repricing a modifier is a change", () => {
    const values = toFormValues(ITEM);
    const removed = { ...values, modifiers: values.modifiers.map((m, i) => (i === 0 ? { ...m, removed: true } : m)) };
    expect(hasFormChanges(ITEM, removed, false)).toBe(true);
    expect(hasFormChanges(ITEM, { ...values, modifiers: [...values.modifiers, newModifierDraft(CHEESE)] }, false)).toBe(true);
    const repriced = { ...values, modifiers: values.modifiers.map((m, i) => (i === 0 ? { ...m, price: "40" } : m)) };
    expect(hasFormChanges(ITEM, repriced, false)).toBe(true);
  });

  test("retyping the same price is not a change", () => {
    expect(hasFormChanges(ITEM, { ...toFormValues(ITEM), basePrice: "189.50" }, false)).toBe(false);
  });
});

describe("validateMenuItemForm", () => {
  test("a valid form has no errors", () => {
    expect(validateMenuItemForm(toFormValues(ITEM), NO_CODES)).toEqual({});
  });

  test("flags missing fields, bad prices and taken codes", () => {
    const values = { ...toFormValues(ITEM), name: " ", basePrice: "12.345", code: "GC-BIBIMBAP" };
    const errors = validateMenuItemForm(values, new Set(["GC-BIBIMBAP"]));
    expect(Object.keys(errors).sort()).toEqual(["basePrice", "code", "name"]);
  });

  test("checks modifier prices, but not the ones being removed", () => {
    const values = toFormValues(ITEM);
    values.modifiers[0] = { ...values.modifiers[0], price: "" };
    values.modifiers[1] = { ...values.modifiers[1], price: "x", removed: true };
    expect(validateMenuItemForm(values, NO_CODES).modifiers).toEqual({ "m-rice": "Enter an add-on price." });
  });
});

describe("applyMenuItemEdit", () => {
  test("drops removed modifiers, keeps the rest in order and appends new ones", () => {
    const values = toFormValues(ITEM);
    values.modifiers[0] = { ...values.modifiers[0], removed: true };
    values.modifiers.push({ ...newModifierDraft(CHEESE), price: "50" });
    const saved = applyMenuItemEdit(ITEM, { ...values, name: "  Kimchi Rice ", code: "gc-kimchi" }, null);

    expect(saved.name).toBe("Kimchi Rice");
    expect(saved.code).toBe("GC-KIMCHI");
    expect(saved.modifiers.map((m) => [m.code, m.price, m.available])).toEqual([
      ["FRIED-EGG", 25, false],
      ["ADD-CHEESE", 50, true],
    ]);
  });

  test("blank optional fields are cleared", () => {
    const saved = applyMenuItemEdit(ITEM, { ...toFormValues(ITEM), servingDescription: "  " }, null);
    expect(saved.servingDescription).toBeNull();
  });
});

describe("suggestCode", () => {
  test("joins the brand code and the name", () => {
    expect(suggestCode("GC", "Kimchi Fried Rice")).toBe("GC-KIMCHI-FRIED-RICE");
    expect(suggestCode("KK", "  Café & Pastry! ")).toBe("KK-CAF-AND-PASTRY");
  });

  test("leaves the code empty until there is a name", () => {
    expect(suggestCode("GC", "  ")).toBe("");
  });

  test("works before a brand is picked", () => {
    expect(suggestCode(undefined, "Kimchi Rice")).toBe("KIMCHI-RICE");
  });

  test("stays within the code limit without a trailing dash", () => {
    const code = suggestCode("GC", "a".repeat(60) + " bb");
    expect(code.length).toBeLessThanOrEqual(64);
    expect(code.endsWith("-")).toBe(false);
  });
});

describe("validateNewMenuItem", () => {
  const valid = { ...emptyFormValues(), name: "Kimchi Rice", code: "GC-KIMCHI-RICE", basePrice: "189", recipe: "Kimchi Rice" };

  test("passes a complete form", () => {
    expect(validateNewMenuItem(valid, new Set(), { brand: "GC", hasPhoto: true })).toEqual({});
  });

  test("asks for a brand and a photo", () => {
    const errors = validateNewMenuItem(valid, new Set(), { brand: undefined, hasPhoto: false });
    expect(errors.brand).toBeDefined();
    expect(errors.photo).toBeDefined();
  });

  test("asks for a recipe only once a brand is picked", () => {
    const blank = { ...valid, recipe: "" };
    expect(validateNewMenuItem(blank, new Set(), { brand: "GC", hasPhoto: true }).recipe).toBeDefined();
    expect(validateNewMenuItem(blank, new Set(), { brand: undefined, hasPhoto: true }).recipe).toBeUndefined();
  });

  test("rejects a code another item uses", () => {
    expect(validateNewMenuItem(valid, new Set(["GC-KIMCHI-RICE"]), { brand: "GC", hasPhoto: true }).code).toBeDefined();
  });
});

describe("newMenuItem", () => {
  test("starts active and available, with no channels yet", () => {
    const values = {
      ...emptyFormValues(),
      name: " Kimchi Rice ",
      code: "gc-kimchi-rice",
      basePrice: "189.50",
      recipe: "Kimchi Rice",
      modifiers: [newModifierDraft({ id: "mod-x", code: "EXTRA-RICE", name: "Extra rice", description: null, price: 35 })],
    };
    const item = newMenuItem("new-1", ITEM.brand, values, "blob:photo");
    expect(item).toMatchObject({
      id: "new-1",
      name: "Kimchi Rice",
      code: "GC-KIMCHI-RICE",
      basePrice: 189.5,
      servingDescription: null,
      imageUrl: "blob:photo",
      available: true,
      active: true,
      channels: [],
    });
    expect(item.modifiers).toHaveLength(1);
  });
});
