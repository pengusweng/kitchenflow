import { describe, expect, test } from "vitest";
import type { MenuItem } from "./menu";
import {
  emptyFormValues,
  hasFormChanges,
  newModifierDraft,
  parsePrice,
  suggestCode,
  toCreatePayload,
  toFormValues,
  toUpdatePayload,
  validateMenuItemForm,
  validateNewMenuItem,
} from "./menu-form";

const ITEM: MenuItem = {
  id: "mi-1",
  code: "GC-KIMCHI-RICE",
  name: "Kimchi Fried Rice",
  brand: { id: "b-gc", code: "GC", name: "Gamcheon", accent: "#3D5A80" },
  description: null,
  servingDescription: "1 bowl",
  recipe: { id: "r-kimchi", name: "Kimchi Fried Rice", active: true },
  imageUrl: null,
  basePrice: 189.5,
  available: true,
  active: true,
  channels: [],
  modifiers: [
    {
      id: "mim-rice",
      modifierId: "m-rice",
      code: "EXTRA-RICE",
      name: "Extra rice",
      description: null,
      price: 35,
      available: true,
    },
    {
      id: "mim-egg",
      modifierId: "m-egg",
      code: "FRIED-EGG",
      name: "Fried egg",
      description: null,
      price: 25,
      available: false,
    },
  ],
};

const CHEESE = {
  id: "m-cheese",
  code: "ADD-CHEESE",
  name: "Add cheese",
  description: null,
};

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
    const removed = {
      ...values,
      modifiers: values.modifiers.map((m, i) => (i === 0 ? { ...m, removed: true } : m)),
    };
    expect(hasFormChanges(ITEM, removed, false)).toBe(true);
    expect(
      hasFormChanges(
        ITEM,
        {
          ...values,
          modifiers: [...values.modifiers, { ...newModifierDraft(CHEESE), price: "45" }],
        },
        false,
      ),
    ).toBe(true);
    const repriced = {
      ...values,
      modifiers: values.modifiers.map((m, i) => (i === 0 ? { ...m, price: "40" } : m)),
    };
    expect(hasFormChanges(ITEM, repriced, false)).toBe(true);
  });

  test("retyping the same price is not a change", () => {
    expect(hasFormChanges(ITEM, { ...toFormValues(ITEM), basePrice: "189.50" }, false)).toBe(false);
  });
});

describe("validateMenuItemForm", () => {
  test("a valid form has no errors", () => {
    expect(validateMenuItemForm(toFormValues(ITEM))).toEqual({});
  });

  test("flags missing fields and bad prices", () => {
    const values = {
      ...toFormValues(ITEM),
      name: " ",
      basePrice: "12.345",
      code: "",
      recipeId: "",
    };
    expect(Object.keys(validateMenuItemForm(values)).sort()).toEqual(["basePrice", "code", "name", "recipeId"]);
  });

  test("checks modifier prices, but not the ones being removed", () => {
    const values = toFormValues(ITEM);
    values.modifiers[0] = { ...values.modifiers[0], price: "" };
    values.modifiers[1] = { ...values.modifiers[1], price: "x", removed: true };
    expect(validateMenuItemForm(values).modifiers).toEqual({
      "mim-rice": "Enter an add-on price.",
    });
  });

  test("a newly added modifier needs its price", () => {
    const values = {
      ...toFormValues(ITEM),
      modifiers: [newModifierDraft(CHEESE)],
    };
    expect(validateMenuItemForm(values).modifiers).toEqual({
      "new-m-cheese": "Enter an add-on price.",
    });
  });
});

describe("toUpdatePayload", () => {
  test("sends only the fields that changed, tidied", () => {
    const values = {
      ...toFormValues(ITEM),
      name: "  Kimchi Rice ",
      code: "gc-kimchi",
      servingDescription: "  ",
    };
    expect(toUpdatePayload(ITEM, values, null)).toEqual({
      menu_item: {
        name: "Kimchi Rice",
        code: "GC-KIMCHI",
        serving_description: null,
      },
    });
  });

  test("adds, reprices and removes modifiers by their links", () => {
    const values = toFormValues(ITEM);
    values.modifiers[0] = { ...values.modifiers[0], price: "40" };
    values.modifiers[1] = { ...values.modifiers[1], removed: true };
    values.modifiers.push({ ...newModifierDraft(CHEESE), price: "45.50" });

    expect(toUpdatePayload(ITEM, values, null)).toEqual({
      menu_item_modifier: {
        create: [{ modifier_id: "m-cheese", additional_price: 45.5 }],
        update: [{ menu_item_modifier_id: "mim-rice", additional_price: 40 }],
        delete: ["mim-egg"],
      },
    });
  });

  test("sends a new photo's upload key and a new recipe", () => {
    const values = { ...toFormValues(ITEM), recipeId: "r-other" };
    expect(toUpdatePayload(ITEM, values, "uploads/u/p.jpg")).toEqual({
      menu_item: { recipe_id: "r-other", img_url: "uploads/u/p.jpg" },
    });
  });

  test("an untouched form sends nothing", () => {
    expect(toUpdatePayload(ITEM, toFormValues(ITEM), null)).toEqual({});
  });
});

describe("delivery channels", () => {
  const WITH_CHANNELS: MenuItem = {
    ...ITEM,
    channels: [
      { channel: "DINE_IN", price: 189.5, available: true, overrideId: null },
      { channel: "TAKEAWAY", price: 189.5, available: true, overrideId: null },
      { channel: "GRABFOOD", price: 219, available: true, overrideId: "c-grab" },
      { channel: "FOODPANDA", price: 189.5, available: true, overrideId: null },
    ],
  };

  test("a channel without its own setting starts blank and on", () => {
    expect(toFormValues(WITH_CHANNELS).channels).toEqual([
      { channel: "GRABFOOD", price: "219", available: true, overrideId: "c-grab" },
      { channel: "FOODPANDA", price: "", available: true, overrideId: null },
    ]);
  });

  test("an untouched channel sends nothing", () => {
    expect(toUpdatePayload(WITH_CHANNELS, toFormValues(WITH_CHANNELS), null)).toEqual({});
  });

  test("reprices, switches off and adds channel settings", () => {
    const values = toFormValues(WITH_CHANNELS);
    values.channels = [
      { ...values.channels[0], price: "229", available: false },
      { ...values.channels[1], price: "199" },
    ];
    expect(toUpdatePayload(WITH_CHANNELS, values, null)).toEqual({
      menu_channel: {
        update: [{ menu_item_channel_id: "c-grab", price: 229, is_available: false }],
        create: [{ order_channel: "FOODPANDA", price: 199, is_available: true }],
      },
    });
  });

  test("clearing a price on a channel that sells drops its setting", () => {
    const values = toFormValues(WITH_CHANNELS);
    values.channels[0] = { ...values.channels[0], price: "" };
    expect(toUpdatePayload(WITH_CHANNELS, values, null)).toEqual({ menu_channel: { delete: ["c-grab"] } });
  });

  test("switching off a channel with no price of its own pins it at the base price", () => {
    const values = toFormValues(WITH_CHANNELS);
    values.channels[1] = { ...values.channels[1], available: false };
    expect(toUpdatePayload(WITH_CHANNELS, values, null)).toEqual({
      menu_channel: { create: [{ order_channel: "FOODPANDA", price: 189.5, is_available: false }] },
    });
  });

  test("a channel price must be a peso amount when given", () => {
    const values = toFormValues(WITH_CHANNELS);
    values.channels[0] = { ...values.channels[0], price: "abc" };
    expect(Object.keys(validateMenuItemForm(values).channels ?? {})).toEqual(["GRABFOOD"]);
  });
});

describe("toCreatePayload", () => {
  test("saves only channels with their own price or switched off, and every kept modifier", () => {
    const values = {
      ...emptyFormValues(),
      name: " Kimchi Rice ",
      code: "gc-kimchi-rice",
      basePrice: "189.50",
      recipeId: "r-kimchi",
      channels: emptyFormValues().channels.map((c) => (c.channel === "GRABFOOD" ? { ...c, price: "219" } : c)),
      modifiers: [{ ...newModifierDraft(CHEESE), price: "0" }],
    };
    expect(toCreatePayload("b-gc", values, "uploads/u/p.jpg")).toEqual({
      menu_item: {
        brand_id: "b-gc",
        recipe_id: "r-kimchi",
        code: "GC-KIMCHI-RICE",
        name: "Kimchi Rice",
        description: null,
        serving_description: null,
        base_price: 189.5,
        img_url: "uploads/u/p.jpg",
      },
      menu_channel: [{ order_channel: "GRABFOOD", price: 219, is_available: true }],
      menu_item_modifier: [{ modifier_id: "m-cheese", additional_price: 0 }],
    });
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
  const valid = {
    ...emptyFormValues(),
    name: "Kimchi Rice",
    code: "GC-KIMCHI-RICE",
    basePrice: "189",
    recipeId: "r-kimchi",
  };

  test("passes a complete form", () => {
    expect(validateNewMenuItem(valid, { brand: "GC", hasPhoto: true })).toEqual({});
  });

  test("asks for a brand and a photo", () => {
    const errors = validateNewMenuItem(valid, {
      brand: undefined,
      hasPhoto: false,
    });
    expect(errors.brand).toBeDefined();
    expect(errors.photo).toBeDefined();
  });

  test("asks for a recipe only once a brand is picked", () => {
    const blank = { ...valid, recipeId: "" };
    expect(validateNewMenuItem(blank, { brand: "GC", hasPhoto: true }).recipeId).toBeDefined();
    expect(validateNewMenuItem(blank, { brand: undefined, hasPhoto: true }).recipeId).toBeUndefined();
  });
});
