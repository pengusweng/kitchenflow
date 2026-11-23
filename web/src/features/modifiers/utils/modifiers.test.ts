import { describe, expect, test } from "vitest";
import type { MenuBrand } from "@/src/features/menu/utils/menu";
import type { ModifierDetailRecord } from "../schemas/modifierSchema";
import {
  formatUsePrice,
  toModifier,
  toModifierUses,
  usesByBrand,
  type ModifierUse,
} from "./modifiers";

const GC: MenuBrand = {
  id: "b-gc",
  code: "GC",
  name: "Gamcheon",
  accent: "#3D5A80",
};
const AI: MenuBrand = {
  id: "b-ai",
  code: "AI",
  name: "Aurelia's Inasal",
  accent: "#9A4A1F",
};
const UNKNOWN: MenuBrand = {
  id: "b-x",
  code: "",
  name: "Unknown brand",
  accent: "#8A94A6",
};

function offeredOn(itemName: string, brand: MenuBrand): ModifierUse {
  return {
    id: `${brand.code}-${itemName}`,
    itemName,
    itemCode: itemName,
    brand,
    price: 0,
    available: true,
    itemActive: true,
  };
}

const RECORD = {
  modifier_id: "7dcb44db-493e-4de2-89fa-82912404dee3",
  code: "MOD-ADD-EGG",
  name: "Add egg",
  description: null,
  is_active: true,
  created_at: "2026-11-15T06:44:06.307Z",
  modified_at: "2026-11-16T06:44:06.307Z",
};

describe("toModifier", () => {
  test("takes the usage count from a list row", () => {
    expect(
      toModifier({ ...RECORD, _count: { menu_item_modifiers_modifier: 3 } }),
    ).toEqual({
      id: RECORD.modifier_id,
      code: "MOD-ADD-EGG",
      name: "Add egg",
      description: null,
      active: true,
      createdAt: RECORD.created_at,
      modifiedAt: RECORD.modified_at,
      useCount: 3,
    });
  });

  test("a written record has no count, so it's given one or starts at zero", () => {
    expect(toModifier(RECORD).useCount).toBe(0);
    expect(toModifier(RECORD, 4).useCount).toBe(4);
  });
});

test("toModifierUses names each item's brand and reads its price as a number", () => {
  const detail: ModifierDetailRecord = {
    ...RECORD,
    menu_item_modifiers_modifier: [
      {
        menu_item_modifier_id: "5ae68f7b-027f-47a6-a18e-fedad04d84a4",
        additional_price: 20,
        is_available: false,
        menu_item: {
          menu_item_id: "m",
          brand_id: AI.id,
          code: "AI-BATCHOY",
          name: "Batchoy",
          is_active: true,
        },
      },
    ],
  };
  expect(toModifierUses(detail, (id) => (id === AI.id ? AI : UNKNOWN))).toEqual(
    [
      {
        id: "5ae68f7b-027f-47a6-a18e-fedad04d84a4",
        itemName: "Batchoy",
        itemCode: "AI-BATCHOY",
        brand: AI,
        price: 20,
        available: false,
        itemActive: true,
      },
    ],
  );
});

describe("usesByBrand", () => {
  test("groups in brand order, items by name, unknown brands last", () => {
    const uses = [
      offeredOn("Pecho", AI),
      offeredOn("Lugaw", UNKNOWN),
      offeredOn("Bibimbap", GC),
      offeredOn("Paa", AI),
    ];
    const groups = usesByBrand(uses, [GC, AI]);
    expect(groups.map((g) => g.brand.id)).toEqual(["b-gc", "b-ai", "b-x"]);
    expect(groups[1].uses.map((u) => u.itemName)).toEqual(["Paa", "Pecho"]);
  });

  test("no uses, no groups", () => {
    expect(usesByBrand([], [GC, AI])).toEqual([]);
  });
});

test("formatUsePrice says Free instead of +₱0.00", () => {
  expect(formatUsePrice(0)).toBe("Free");
  expect(formatUsePrice(35)).toMatch(/^\+₱\s?35\.00$/);
});
