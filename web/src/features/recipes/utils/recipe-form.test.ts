import { describe, expect, it } from "vitest";
import type { RecipeDetail } from "./recipes";
import {
  countProblems,
  emptyRecipeForm,
  hasRecipeChanges,
  firstProblemId,
  moveItem,
  newIngredientDraft,
  newStepDraft,
  parseQuantity,
  suggestRecipeCode,
  toCreateRecipePayload,
  toRecipeFormValues,
  toUpdateRecipePayload,
  validateRecipeForm,
  type RecipeFormValues,
} from "./recipe-form";
import { SEEDED_UNITS } from "./units";

const UNITS = new Set(SEEDED_UNITS.map((unit) => unit.code));

function ingredient(name: string, quantity: string, unit = "g", note = "") {
  return { ...newIngredientDraft(unit), name, quantity, note };
}

function step(instruction: string) {
  return { ...newStepDraft(), instruction };
}

function validForm(overrides: Partial<RecipeFormValues> = {}): RecipeFormValues {
  return {
    brand: "GC",
    name: "Kimchi Rice",
    code: "RCP-GC-KIMCHI-RICE",
    notes: "",
    ingredients: [ingredient("Cooked rice", "250"), ingredient("Kimchi", "80")],
    steps: [step("Fry the kimchi."), step("Add the rice.")],
    ...overrides,
  };
}

describe("suggestRecipeCode", () => {
  it("follows the seeded RCP-BRAND-NAME shape", () => {
    expect(suggestRecipeCode("GC", "Kimchi Fried Rice")).toBe("RCP-GC-KIMCHI-FRIED-RICE");
    expect(suggestRecipeCode("", "Halo-Halo")).toBe("RCP-HALO-HALO");
    expect(suggestRecipeCode("GC", "  ")).toBe("");
  });

  it("stays within the API's 64 characters without a trailing dash", () => {
    const code = suggestRecipeCode("GC", "word ".repeat(30));
    expect(code.length).toBeLessThanOrEqual(64);
    expect(code.endsWith("-")).toBe(false);
  });
});

describe("parseQuantity", () => {
  it("accepts up to three decimals", () => {
    expect(parseQuantity("250")).toEqual({ value: 250 });
    expect(parseQuantity(" 0.125 ")).toEqual({ value: 0.125 });
    expect(parseQuantity(".5")).toEqual({ value: 0.5 });
  });

  it("names the problem otherwise", () => {
    expect(parseQuantity("")).toEqual({ error: "Enter an amount." });
    expect(parseQuantity("1/2")).toEqual({ error: "Use a number, like 250 or 0.5." });
    expect(parseQuantity("0.1234")).toEqual({ error: "Use at most 3 decimal places." });
    expect(parseQuantity("0")).toEqual({ error: "Must be more than 0." });
    expect(parseQuantity("1000000000")).toEqual({ error: "That amount is too large." });
  });
});

describe("validateRecipeForm", () => {
  it("passes a complete recipe", () => {
    expect(validateRecipeForm(validForm(), new Set(), UNITS)).toEqual({});
  });

  it("requires brand, name and a code nobody else uses", () => {
    const errors = validateRecipeForm(
      validForm({ brand: "", name: " ", code: "rcp-gc-bibimbap" }),
      new Set(["RCP-GC-BIBIMBAP"]),
      UNITS,
    );
    expect(errors.brand).toBe("Choose a brand.");
    expect(errors.name).toBe("Enter a recipe name.");
    expect(errors.code).toBe("Another recipe already uses this code.");
  });

  it("skips untouched rows but needs at least one ingredient and one step", () => {
    const blank = validForm({ ingredients: [ingredient("", "")], steps: [step("  ")] });
    const errors = validateRecipeForm(blank, new Set(), UNITS);
    expect(errors.ingredients).toBe("Add at least one ingredient.");
    expect(errors.steps).toBe("Add at least one step.");
    expect(errors.ingredient).toBeUndefined();

    const spare = validForm();
    spare.ingredients.push(ingredient("", ""));
    spare.steps.push(step(""));
    expect(validateRecipeForm(spare, new Set(), UNITS)).toEqual({});
  });

  it("flags half-filled rows and repeated names, ignoring case and spacing", () => {
    const form = validForm({
      ingredients: [ingredient("Kimchi", "80"), ingredient(" kimchi ", "10"), ingredient("", "5"), ingredient("Salt", "")],
    });
    const errors = validateRecipeForm(form, new Set(), UNITS);
    const [, repeat, nameless, amountless] = form.ingredients;
    expect(errors.ingredient?.[repeat.key]).toEqual({ name: "Already listed above." });
    expect(errors.ingredient?.[nameless.key]).toEqual({ name: "Name the ingredient." });
    expect(errors.ingredient?.[amountless.key]).toEqual({ quantity: "Enter an amount." });
    expect(countProblems(errors)).toBe(3);
  });

  it("rejects units the API doesn't know", () => {
    const form = validForm({ ingredients: [ingredient("Rice", "1", "cup")] });
    expect(validateRecipeForm(form, new Set(), UNITS).ingredient?.[form.ingredients[0].key]).toEqual({ unit: "Choose a unit." });
  });
});

describe("firstProblemId", () => {
  it("points at the first problem in reading order", () => {
    const form = validForm({ ingredients: [ingredient("Rice", "0")], steps: [step("")] });
    const errors = validateRecipeForm(form, new Set(), UNITS);
    expect(firstProblemId(form, errors)).toBe(`${form.ingredients[0].key}-quantity`);

    const noName = validForm({ name: "" });
    expect(firstProblemId(noName, validateRecipeForm(noName, new Set(), UNITS))).toBe("recipe-name");
  });
});

describe("moveItem", () => {
  it("moves within bounds and leaves out-of-range moves alone", () => {
    const list = ["a", "b", "c"];
    expect(moveItem(list, 2, -1)).toEqual(["a", "c", "b"]);
    expect(moveItem(list, 0, 1)).toEqual(["b", "a", "c"]);
    expect(moveItem(list, 0, -1)).toBe(list);
    expect(moveItem(list, 2, 1)).toBe(list);
  });
});

describe("toCreateRecipePayload", () => {
  it("builds the CreateFullRecipeDTO body, numbering steps by their order", () => {
    const form = validForm({
      name: "  Kimchi Rice ",
      notes: "  ",
      ingredients: [ingredient(" Cooked rice ", "250.5", "g", " Day-old "), ingredient("", "")],
      steps: [step(""), step(" Fry. "), step("Plate.")],
    });
    expect(toCreateRecipePayload(form, "brand-1")).toEqual({
      brand_id: "brand-1",
      code: "RCP-GC-KIMCHI-RICE",
      name: "Kimchi Rice",
      formulation_notes: null,
      ingredients: [{ ingredient_name: "Cooked rice", quantity: 250.5, unit_code: "g", note: "Day-old" }],
      steps: [
        { step_no: 1, instruction: "Fry." },
        { step_no: 2, instruction: "Plate." },
      ],
    });
  });
});

describe("emptyRecipeForm", () => {
  it("starts with one blank ingredient and step, on the given brand", () => {
    const form = emptyRecipeForm("AI");
    expect(form.brand).toBe("AI");
    expect(form.ingredients).toHaveLength(1);
    expect(form.steps).toHaveLength(1);
    // Fixed, so the server and browser render the same ids; added rows never reuse them.
    expect(form.ingredients[0].key).toBe(emptyRecipeForm().ingredients[0].key);
    expect(newIngredientDraft().key).not.toBe(form.ingredients[0].key);
    expect(newStepDraft().key).not.toBe(form.steps[0].key);
  });
});

describe("editing", () => {
  const brand = { id: "00000000-0000-4000-8000-000000000001", code: "GC", name: "Gamcheon", accent: "#3D5A80" };
  // As GET /recipes/:id, its ingredients and its steps arrive.
  const recipe: RecipeDetail = {
    id: "rcp-1",
    code: "RCP-GC-KIMCHI-RICE",
    name: "Kimchi Rice",
    brand,
    version: 1,
    active: true,
    createdAt: "2026-11-01T00:00:00.000Z",
    modifiedAt: "2026-11-01T00:00:00.000Z",
    ingredients: [
      { id: "ing-rice", name: "Cooked rice", quantity: "250.000", unit: "g", note: null },
      { id: "ing-kimchi", name: "Kimchi", quantity: "80.000", unit: "g", note: "Chopped" },
    ],
    steps: [
      { id: "step-fry", number: 1, instruction: "Fry the kimchi." },
      { id: "step-add", number: 2, instruction: "Add the rice." },
    ],
    formulationNotes: null,
    usedBy: [],
  };
  const [rice, kimchi] = recipe.ingredients;
  const [fry, add] = recipe.steps;

  it("fills the form with the recipe, keyed by the API's ids", () => {
    const values = toRecipeFormValues(recipe);
    expect(values).toMatchObject({ brand: "GC", name: "Kimchi Rice", notes: "" });
    expect(values.ingredients.map((i) => [i.key, i.quantity, i.note])).toEqual([
      [rice.id, "250", ""],
      [kimchi.id, "80", "Chopped"],
    ]);
    expect(values.steps.map((s) => s.key)).toEqual([fry.id, add.id]);
  });

  it("sends nothing when nothing changed", () => {
    const payload = toUpdateRecipePayload(recipe, toRecipeFormValues(recipe));
    expect(payload).toEqual({});
    expect(hasRecipeChanges(payload)).toBe(false);
  });

  it("sends only what changed: field edits, additions, removals and renumbered steps", () => {
    const values = toRecipeFormValues(recipe);
    values.name = "Kimchi Fried Rice";
    values.notes = " Day-old rice. ";
    // Kimchi's amount changes, rice is cleared to blank (removed), and an egg is added.
    values.ingredients = [
      { ...values.ingredients[0], name: "", quantity: "", note: "" },
      { ...values.ingredients[1], quantity: "100" },
      ingredient("Egg", "1", "pc"),
    ];
    // The steps swap, and a new one goes last.
    values.steps = [values.steps[1], { ...values.steps[0], instruction: "Fry the kimchi hard." }, step("Plate.")];

    expect(toUpdateRecipePayload(recipe, values)).toEqual({
      name: "Kimchi Fried Rice",
      formulation_notes: "Day-old rice.",
      ingredients: {
        create: [{ ingredient_name: "Egg", quantity: 1, unit_code: "pc", note: null }],
        update: [{ recipe_ingredient_id: kimchi.id, quantity: 100 }],
        delete: [rice.id],
      },
      steps: {
        create: [{ step_no: 3, instruction: "Plate." }],
        update: [
          { recipe_step_id: add.id, step_no: 1 },
          { recipe_step_id: fry.id, step_no: 2, instruction: "Fry the kimchi hard." },
        ],
      },
    });
  });
});
