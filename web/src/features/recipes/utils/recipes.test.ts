import { describe, expect, test } from "vitest";
import {
  brandAccent,
  formatQuantity,
  formatRecipeDate,
  toRecipe,
  toRecipeBrand,
  toRecipeVersion,
  toSteps,
} from "./recipes";

const BRAND_ID = "00000000-0000-4000-8000-000000000001";
const RECIPE_ID = "00000000-0000-4000-8000-000000000010";

describe("formatRecipeDate", () => {
  test("shows the date in Manila time", () => {
    // 20:00 UTC is already the next day in Manila.
    expect(formatRecipeDate("2026-11-19T20:00:00.000Z")).toBe("Nov 20, 2026");
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

describe("brands", () => {
  test("get a stable accent from their code, without the database's padding", () => {
    expect(brandAccent("GC")).toBe(brandAccent("GC"));
    expect(brandAccent("GC")).toMatch(/^#[0-9A-F]{6}$/);
    const brand = toRecipeBrand({
      brand_id: BRAND_ID,
      code: "GC  ",
      name: "Gamcheon",
      logo_url: null,
      is_active: true,
      created_at: "2026-01-01T00:00:00.000Z",
      modified_at: "2026-01-01T00:00:00.000Z",
    });
    expect(brand).toEqual({ id: BRAND_ID, code: "GC", name: "Gamcheon", accent: brandAccent("GC") });
  });
});

describe("API records", () => {
  test("map a recipe row to a table row", () => {
    const brand = { id: BRAND_ID, code: "GC", name: "Gamcheon", accent: "#3D5A80" };
    expect(
      toRecipe(
        {
          recipe_id: RECIPE_ID,
          brand_id: BRAND_ID,
          code: "RCP-GC-KIMCHI",
          name: "Kimchi Rice",
          version: 2,
          is_active: false,
          created_at: "2026-01-01T00:00:00.000Z",
          modified_at: "2026-02-01T00:00:00.000Z",
        },
        brand,
      ),
    ).toEqual({
      id: RECIPE_ID,
      code: "RCP-GC-KIMCHI",
      name: "Kimchi Rice",
      brand,
      version: 2,
      active: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      modifiedAt: "2026-02-01T00:00:00.000Z",
    });
  });

  test("put steps in step order", () => {
    const step = (n: number) => ({ recipe_step_id: `${RECIPE_ID.slice(0, -1)}${n}`, step_no: n, instruction: `Step ${n}` });
    expect(toSteps([step(2), step(1)]).map((s) => s.number)).toEqual([1, 2]);
  });

  test("turn a history row into a version, notes included", () => {
    const version = toRecipeVersion({
      recipe_history_id: "00000000-0000-4000-8000-000000000040",
      version: 3,
      recipe_snapshot: { code: "RCP-GC-KIMCHI", name: "Kimchi Rice", formulation_notes: "Day-old rice." },
      ingredients_snapshot: [
        {
          recipe_ingredient_id: "00000000-0000-4000-8000-000000000020",
          ingredient_name: "Rice",
          quantity: "250",
          unit_code: "g",
          note: null,
        },
      ],
      steps_snapshot: [],
      created_at: "2026-03-01T00:00:00.000Z",
    });
    expect(version).toMatchObject({
      version: 3,
      savedAt: "2026-03-01T00:00:00.000Z",
      name: "Kimchi Rice",
      formulationNotes: "Day-old rice.",
      ingredients: [{ name: "Rice", quantity: "250", unit: "g" }],
    });
  });
});
