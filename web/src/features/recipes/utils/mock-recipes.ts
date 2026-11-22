// Placeholder data until the page is wired to the recipes API. Records use the
// API's snake_case shape so wiring it up only swaps the data source; the page
// itself only ever sees `toRecipe` / `toRecipeDetail` output.
import type { MenuBrand } from "@/src/features/menu/utils/menu";
import { suggestCode } from "@/src/features/menu/utils/menu-form";
import { MOCK_BRANDS, MOCK_MENU_ITEMS } from "@/src/features/menu/utils/mock-menu";
import type { Recipe, RecipeDetail, RecipeUse } from "./recipes";

export type RecipeRecord = {
  recipe_id: string;
  brand_id: string;
  code: string;
  name: string;
  version: number;
  is_active: boolean;
  created_at: string;
  modified_at: string;
};

/** GET /recipe-ingredients/recipe/:id rows. Quantity is a Decimal, which arrives as a string. */
export type RecipeIngredientRecord = {
  recipe_ingredient_id: string;
  ingredient_name: string;
  quantity: string;
  unit_code: string;
  note: string | null;
};

/** GET /recipe-steps/recipe/:id rows. */
export type RecipeStepRecord = { recipe_step_id: string; step_no: number; instruction: string };

// Retired recipes no menu item uses any more.
const RETIRED: Record<string, string[]> = {
  GC: ["Budae Jjigae", "Rose Tteokbokki"],
  AI: ["Pork Inasal Skewer"],
  KK: ["Mango Float", "Hazelnut Cold Brew"],
};

type Content = {
  notes: string | null;
  /** [name, quantity, unit, note?] in the seed data's units: g, kg, ml, l, tsp, tbsp, pc. */
  ingredients: [string, number, string, string?][];
  steps: string[];
};

// Adapted from the server's seed data. Recipes left out here have no
// ingredients or steps yet, which is a real state the page has to handle.
const CONTENT: Record<string, Content> = {
  "GC:Kimchi Fried Rice": {
    notes: "Yields 1 bowl. Use day-old rice so the grains fry apart instead of clumping.",
    ingredients: [
      ["Cooked rice", 250, "g", "Day-old"],
      ["Kimchi", 80, "g", "Chopped"],
      ["Gochujang", 1, "tbsp"],
      ["Mixed vegetables", 40, "g"],
      ["Sesame oil", 1, "tsp"],
    ],
    steps: [
      "Stir-fry the kimchi and vegetables over high heat for 2 minutes.",
      "Add the rice and gochujang; fry for 3 minutes, pressing the rice against the pan so it catches.",
      "Finish with sesame oil and plate in a bowl.",
    ],
  },
  "GC:Bibimbap": {
    notes: "Yields 1 bowl.",
    ingredients: [
      ["Cooked rice", 250, "g"],
      ["Mixed vegetables", 120, "g", "Julienned"],
      ["Egg", 1, "pc", "Fried sunny side up"],
      ["Gochujang", 1, "tbsp"],
    ],
    steps: ["Arrange the vegetables over the rice in sections.", "Top with the fried egg and gochujang."],
  },
  "GC:Japchae": {
    notes: "Yields 1 plate.",
    ingredients: [
      ["Glass noodles", 100, "g"],
      ["Mixed vegetables", 80, "g"],
      ["Soy sauce", 2, "tbsp"],
    ],
    steps: ["Boil the noodles for 6 minutes and drain.", "Stir-fry with the vegetables and soy sauce."],
  },
  "GC:Budae Jjigae": {
    notes: "Retired when the stew came off the menu.",
    ingredients: [
      ["Kimchi", 100, "g"],
      ["Spam", 60, "g", "Sliced"],
      ["Instant noodles", 1, "pc"],
      ["Anchovy stock", 0.5, "l"],
    ],
    steps: ["Arrange everything in the pot.", "Pour in the stock and boil for 8 minutes."],
  },
  "AI:Chicken Inasal Paa": {
    notes: "Yields 1 leg quarter with rice. Marinate at least 4 hours; overnight is better.",
    ingredients: [
      ["Marinated chicken leg quarter", 1, "pc"],
      ["Chicken oil", 15, "ml", "For basting"],
      ["Cooked rice", 200, "g"],
      ["Calamansi", 2, "pc"],
      ["Soy sauce", 1, "tbsp"],
    ],
    steps: [
      "Grill the marinated leg over medium coals for 12 to 15 minutes a side, basting with chicken oil.",
      "Check that the thickest part reaches 74 °C.",
      "Serve with rice, calamansi and soy sauce.",
    ],
  },
  "AI:Halo-Halo": {
    notes: "Yields 1 glass.",
    ingredients: [
      ["Halo-halo mix", 120, "g"],
      ["Shaved ice", 200, "g"],
      ["Evaporated milk", 60, "ml"],
    ],
    steps: ["Layer the mix in a tall glass.", "Add the shaved ice and pour the milk on top."],
  },
  "KK:Americano": {
    notes: "Yields 12 oz.",
    ingredients: [
      ["Espresso", 60, "ml", "Double shot"],
      ["Hot water", 240, "ml"],
    ],
    steps: ["Pull a double shot.", "Top with hot water."],
  },
  "KK:Matcha Latte": {
    notes: null,
    ingredients: [
      ["Matcha powder", 4, "g"],
      ["Hot water", 30, "ml"],
      ["Fresh milk", 200, "ml"],
      ["Ice", 150, "g"],
    ],
    steps: ["Whisk the matcha with the hot water until there are no lumps.", "Pour over the milk and ice."],
  },
};

const DAY = 24 * 60 * 60 * 1000;
const LATEST = Date.parse("2026-11-20T09:30:00+08:00");

function toRecord(brand: MenuBrand, name: string, index: number, active: boolean): RecipeRecord {
  // Deterministic spread of versions and dates, so the table sorts the same on every load.
  const version = (index % 4) + 1;
  const modified = LATEST - ((index * 7 + brand.code.charCodeAt(0)) % 90) * DAY;
  const created = modified - (version - 1) * 21 * DAY - 30 * DAY;
  return {
    recipe_id: `rcp-${brand.code.toLowerCase()}-${String(index + 1).padStart(2, "0")}`,
    brand_id: brand.id,
    // Same shape as the seeded codes, e.g. RCP-GC-KIMCHI-FRIED-RICE.
    code: `RCP-${suggestCode(brand.code, name)}`,
    name,
    version,
    is_active: active,
    created_at: new Date(created).toISOString(),
    modified_at: new Date(modified).toISOString(),
  };
}

// The recipes the mock menu items already use, so names match the menu page.
export const MOCK_RECIPES: RecipeRecord[] = MOCK_BRANDS.flatMap((brand) => {
  const inUse = [
    ...new Set(MOCK_MENU_ITEMS.filter((item) => item.brand_id === brand.id).map((item) => item.recipe.name)),
  ];
  const retired = RETIRED[brand.code] ?? [];
  return [
    ...inUse.map((name, i) => toRecord(brand, name, i, true)),
    ...retired.map((name, i) => toRecord(brand, name, inUse.length + i, false)),
  ];
});

export function toRecipe(record: RecipeRecord, brands: MenuBrand[]): Recipe {
  const brand = brands.find((b) => b.id === record.brand_id);
  if (!brand) throw new Error(`Unknown brand ${record.brand_id} for recipe ${record.code}.`);
  return {
    id: record.recipe_id,
    code: record.code,
    name: record.name,
    brand,
    version: record.version,
    active: record.is_active,
    createdAt: record.created_at,
    modifiedAt: record.modified_at,
  };
}

export function toRecipeDetail(
  recipe: Recipe,
  data: {
    ingredients: RecipeIngredientRecord[];
    steps: RecipeStepRecord[];
    formulationNotes: string | null;
    usedBy: RecipeUse[];
  },
): RecipeDetail {
  return {
    ...recipe,
    ingredients: data.ingredients.map((i) => ({
      id: i.recipe_ingredient_id,
      name: i.ingredient_name,
      quantity: i.quantity,
      unit: i.unit_code,
      note: i.note,
    })),
    steps: [...data.steps]
      .sort((a, b) => a.step_no - b.step_no)
      .map((s) => ({ id: s.recipe_step_id, number: s.step_no, instruction: s.instruction })),
    formulationNotes: data.formulationNotes,
    usedBy: data.usedBy,
  };
}

/** The recipe with its ingredients, steps and the menu items that use it; null for an unknown id. */
export function findMockRecipe(id: string): RecipeDetail | null {
  const record = MOCK_RECIPES.find((r) => r.recipe_id === id);
  if (!record) return null;
  const recipe = toRecipe(record, MOCK_BRANDS);
  const content = CONTENT[`${recipe.brand.code}:${recipe.name}`];

  return toRecipeDetail(recipe, {
    ingredients: (content?.ingredients ?? []).map(([name, quantity, unit, note], i) => ({
      recipe_ingredient_id: `${id}-ing-${i + 1}`,
      ingredient_name: name,
      // As Prisma serialises Decimal(12, 3).
      quantity: quantity.toFixed(3),
      unit_code: unit,
      note: note ?? null,
    })),
    steps: (content?.steps ?? []).map((instruction, i) => ({
      recipe_step_id: `${id}-step-${i + 1}`,
      step_no: i + 1,
      instruction,
    })),
    formulationNotes: content?.notes ?? null,
    usedBy: MOCK_MENU_ITEMS.filter(
      (item) => item.brand_id === recipe.brand.id && item.recipe.name === recipe.name,
    ).map((item) => ({ id: item.menu_item_id, name: item.name, code: item.code, active: item.is_active })),
  });
}

/** Every mock recipe with its content, as the recipe store starts out. */
export const MOCK_RECIPE_DETAILS: RecipeDetail[] = MOCK_RECIPES.map((record) => {
  const detail = findMockRecipe(record.recipe_id);
  if (!detail) throw new Error(`Mock recipe ${record.recipe_id} has no detail.`);
  return detail;
});
