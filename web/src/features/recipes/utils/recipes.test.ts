import { describe, expect, test } from "vitest";
import { filterRecipes, formatQuantity, formatRecipeDate, type Recipe } from "./recipes";
import { findMockRecipe, MOCK_RECIPES, toRecipe } from "./mock-recipes";
import { MOCK_BRANDS } from "@/src/features/menu/utils/mock-menu";

const GC = { id: "b-gc", code: "GC", name: "Gamcheon", accent: "#3D5A80" };
const AI = { id: "b-ai", code: "AI", name: "Aurelia's Inasal", accent: "#9A4A1F" };

function recipe(name: string, overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: name,
    code: `GC-${name.toUpperCase().replace(/\s+/g, "-")}`,
    name,
    brand: GC,
    version: 1,
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    modifiedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

const RECIPES = [
  recipe("Kimchi Fried Rice", { modifiedAt: "2026-11-01T00:00:00.000Z" }),
  recipe("Bibimbap", { modifiedAt: "2026-09-01T00:00:00.000Z" }),
  recipe("Budae Jjigae", { active: false, modifiedAt: "2026-10-01T00:00:00.000Z" }),
  recipe("Chicken Inasal Paa", { brand: AI, code: "AI-CHICKEN-INASAL-PAA" }),
];
const ALL = { search: "", brand: undefined, status: undefined };
const names = (list: Recipe[]) => list.map((r) => r.name);

describe("filterRecipes", () => {
  test("matches every search term on the name or the code", () => {
    expect(names(filterRecipes(RECIPES, { ...ALL, search: "fried kimchi" }, null))).toEqual(["Kimchi Fried Rice"]);
    expect(names(filterRecipes(RECIPES, { ...ALL, search: "ai-chicken" }, null))).toEqual(["Chicken Inasal Paa"]);
  });

  test("filters by status and brand", () => {
    expect(names(filterRecipes(RECIPES, { ...ALL, status: "inactive" }, null))).toEqual(["Budae Jjigae"]);
    expect(filterRecipes(RECIPES, { ...ALL, status: "active", brand: "GC" }, null)).toHaveLength(2);
  });

  test("lists the most recently updated first by default", () => {
    expect(names(filterRecipes(RECIPES, ALL, null))).toEqual([
      "Kimchi Fried Rice",
      "Budae Jjigae",
      "Bibimbap",
      "Chicken Inasal Paa",
    ]);
  });

  test("sorts by name or by update date in either direction", () => {
    expect(names(filterRecipes(RECIPES, ALL, { by: "name", order: "asc" }))[0]).toBe("Bibimbap");
    expect(names(filterRecipes(RECIPES, ALL, { by: "name", order: "desc" }))[0]).toBe("Kimchi Fried Rice");
    expect(names(filterRecipes(RECIPES, ALL, { by: "modified_at", order: "asc" }))[0]).toBe("Chicken Inasal Paa");
  });
});

describe("formatRecipeDate", () => {
  test("shows the date in Manila time", () => {
    // 20:00 UTC is already the next day in Manila.
    expect(formatRecipeDate("2026-11-19T20:00:00.000Z")).toBe("Nov 20, 2026");
  });
});

describe("mock recipes", () => {
  test("have unique codes and resolve to known brands", () => {
    const recipes = MOCK_RECIPES.map((r) => toRecipe(r, MOCK_BRANDS));
    expect(new Set(recipes.map((r) => r.code)).size).toBe(recipes.length);
    expect(recipes.some((r) => !r.active)).toBe(true);
  });
});

describe("formatQuantity", () => {
  test("drops the API's trailing zeros", () => {
    expect(formatQuantity("250.000")).toBe("250");
    expect(formatQuantity("0.500")).toBe("0.5");
    expect(formatQuantity("1.250")).toBe("1.25");
  });

  test("leaves anything that isn't a number as sent", () => {
    expect(formatQuantity("a pinch")).toBe("a pinch");
  });
});

describe("findMockRecipe", () => {
  const idOf = (name: string) => MOCK_RECIPES.find((r) => r.name === name)!.recipe_id;

  test("returns ingredients, steps in order and the menu items that use it", () => {
    const recipe = findMockRecipe(idOf("Kimchi Fried Rice"))!;
    expect(recipe.code).toBe("RCP-GC-KIMCHI-FRIED-RICE");
    expect(recipe.ingredients[0]).toMatchObject({ name: "Cooked rice", quantity: "250.000", unit: "g" });
    expect(recipe.steps.map((s) => s.number)).toEqual([1, 2, 3]);
    expect(recipe.usedBy.map((u) => u.name)).toEqual(["Kimchi Fried Rice"]);
  });

  test("gives a recipe without content empty lists, not filler", () => {
    const recipe = findMockRecipe(idOf("Mandu"))!;
    expect(recipe.ingredients).toEqual([]);
    expect(recipe.steps).toEqual([]);
    expect(recipe.formulationNotes).toBeNull();
  });

  test("finds no menu items for a retired recipe, and nothing for an unknown id", () => {
    expect(findMockRecipe(idOf("Budae Jjigae"))!.usedBy).toEqual([]);
    expect(findMockRecipe("rcp-missing")).toBeNull();
  });
});
