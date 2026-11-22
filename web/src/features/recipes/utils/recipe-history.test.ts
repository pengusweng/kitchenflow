import { describe, expect, it } from "vitest";
import { MOCK_RECIPE_DETAILS, MOCK_RECIPE_HISTORIES } from "./mock-recipes";
import { describeChanges, snapshotOf, type RecipeVersion } from "./recipe-history";

const ingredient = (name: string, quantity: string, unit = "g", note: string | null = null) => ({
  id: name,
  name,
  quantity,
  unit,
  note,
});
const steps = (...instructions: string[]) => instructions.map((instruction, i) => ({ id: `s${i}`, number: i + 1, instruction }));

const v1: RecipeVersion = {
  version: 1,
  savedAt: "2026-10-01T00:00:00.000Z",
  name: "Kimchi Rice",
  code: "RCP-GC-KIMCHI-RICE",
  ingredients: [ingredient("Rice", "250.000"), ingredient("Kimchi", "80.000")],
  steps: steps("Fry the kimchi.", "Add the rice."),
  formulationNotes: null,
};
const next = (patch: Partial<RecipeVersion>): RecipeVersion => ({ ...v1, version: 2, ...patch });

describe("describeChanges", () => {
  it("calls the first version created", () => {
    expect(describeChanges(undefined, v1)).toEqual(["Created"]);
  });

  it("names renames, code changes and edited notes", () => {
    expect(describeChanges(v1, next({ name: "Kimchi Fried Rice", code: "RCP-GC-KFR", formulationNotes: "Day-old rice." }))).toEqual([
      "Renamed from “Kimchi Rice”",
      "Code was RCP-GC-KIMCHI-RICE",
      "Edited formulation notes",
    ]);
  });

  it("matches ingredients by name, ignoring case, and shows amount changes", () => {
    const changed = next({
      ingredients: [ingredient("rice", "300.000"), ingredient("Gochujang", "1.000", "tbsp"), ingredient("Egg", "1.000", "pc")],
    });
    expect(describeChanges(v1, changed)).toEqual(["Added Gochujang and Egg", "Removed Kimchi", "rice 250 g → 300 g"]);
  });

  it("counts many changes instead of listing them", () => {
    const many = ["A", "B", "C", "D"].map((n) => ingredient(n, "1.000"));
    const before = next({ version: 1, ingredients: many });
    const after = next({ ingredients: [...many.map((i) => ({ ...i, quantity: "2.000" })), ingredient("E", "1.000"), ingredient("F", "1.000"), ingredient("G", "1.000")] });
    expect(describeChanges(before, after)).toEqual(["Added E, F and 1 more", "Changed 4 amounts"]);
  });

  it("tells reworded, added and reordered steps apart", () => {
    expect(describeChanges(v1, next({ steps: steps("Fry the kimchi hard.", "Add the rice.") }))).toEqual(["Reworded 1 step"]);
    expect(describeChanges(v1, next({ steps: steps("Fry the kimchi.", "Add the rice.", "Plate.") }))).toEqual(["Added 1 step"]);
    expect(describeChanges(v1, next({ steps: steps("Add the rice.", "Fry the kimchi.") }))).toEqual(["Reordered the steps"]);
  });

  it("notices a changed ingredient note", () => {
    const changed = next({ ingredients: [ingredient("Rice", "250.000", "g", "Day-old"), ingredient("Kimchi", "80.000")] });
    expect(describeChanges(v1, changed)).toEqual(["Edited 1 ingredient note"]);
  });
});

describe("mock history", () => {
  it("has every version up to the current one, the newest matching the recipe", () => {
    for (const recipe of MOCK_RECIPE_DETAILS) {
      const versions = MOCK_RECIPE_HISTORIES[recipe.id];
      expect(versions.map((v) => v.version)).toEqual(Array.from({ length: recipe.version }, (_, i) => i + 1));
      expect({ ...versions.at(-1), savedAt: undefined }).toEqual({ ...snapshotOf(recipe), savedAt: undefined });
      expect(versions[0].savedAt).toBe(recipe.createdAt);
      // Each saved version differs from the one before, as the API refuses empty edits.
      versions.slice(1).forEach((v, i) => expect(describeChanges(versions[i], v)).not.toEqual(["No visible changes"]));
    }
  });
});
