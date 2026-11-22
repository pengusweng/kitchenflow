import type { MenuBrand } from "@/src/features/menu/utils/menu";
import { suggestCode } from "@/src/features/menu/utils/menu-form";
import { formatQuantity, type RecipeDetail } from "./recipes";
import { parseDecimal } from "./units";

// The same limits the API enforces (CreateFullRecipeDTO and its nested DTOs).
export const RECIPE_LIMITS = {
  name: 150,
  code: 64,
  notes: 5000,
  ingredientName: 255,
  instruction: 2000,
  maxQuantity: 999_999_999.999,
};

const DEFAULT_UNIT = "g";

/** One ingredient row as typed. `key` only identifies the row on screen. */
export type IngredientDraft = { key: string; name: string; quantity: string; unit: string; note: string };
export type StepDraft = { key: string; instruction: string };

export type RecipeFormValues = {
  /** Brand code; empty until one is chosen. */
  brand: string;
  name: string;
  code: string;
  notes: string;
  ingredients: IngredientDraft[];
  steps: StepDraft[];
};

type IngredientField = "name" | "quantity" | "unit";

export type RecipeFormErrors = {
  brand?: string;
  name?: string;
  code?: string;
  notes?: string;
  /** About the list as a whole, e.g. none filled in yet. */
  ingredients?: string;
  steps?: string;
  /** Per row, keyed by IngredientDraft.key. */
  ingredient?: Record<string, Partial<Record<IngredientField, string>>>;
  /** Keyed by StepDraft.key. */
  step?: Record<string, string>;
};

let nextKey = 0;
const newKey = (prefix: string) => `${prefix}-${++nextKey}`;

export function newIngredientDraft(unit = DEFAULT_UNIT): IngredientDraft {
  return { key: newKey("ingredient"), name: "", quantity: "", unit, note: "" };
}

export function newStepDraft(): StepDraft {
  return { key: newKey("step"), instruction: "" };
}

/**
 * A fresh form: one blank ingredient and one blank step, so typing can start straight away.
 * Their keys are fixed (added rows count up from 1) so the server and browser render the same ids.
 */
export function emptyRecipeForm(brand = ""): RecipeFormValues {
  return {
    brand,
    name: "",
    code: "",
    notes: "",
    ingredients: [{ ...newIngredientDraft(), key: "ingredient-0" }],
    steps: [{ ...newStepDraft(), key: "step-0" }],
  };
}

/** e.g. ("GC", "Kimchi Rice") → "RCP-GC-KIMCHI-RICE", the seeded codes' shape. */
export function suggestRecipeCode(brand: string, name: string): string {
  const code = suggestCode(brand || undefined, name);
  return code ? `RCP-${code}`.slice(0, RECIPE_LIMITS.code).replace(/-$/, "") : "";
}

/** Moves the item at `index` by `delta` places; out-of-range moves return the list unchanged. */
export function moveItem<T>(list: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

// A row nobody has touched is skipped rather than flagged, so a spare
// blank line at the end never blocks saving.
const isBlankIngredient = (i: IngredientDraft) => !i.name.trim() && !i.quantity.trim() && !i.note.trim();
const isBlankStep = (s: StepDraft) => !s.instruction.trim();

/** The quantity as a number, or the problem with it. */
export function parseQuantity(text: string) {
  return parseDecimal(text, { places: 3, max: RECIPE_LIMITS.maxQuantity, what: "an amount" });
}

/** `unitCodes` are the units the API knows, from GET /units. */
export function validateRecipeForm(
  values: RecipeFormValues,
  takenCodes: Set<string>,
  unitCodes: Set<string>,
): RecipeFormErrors {
  const errors: RecipeFormErrors = {};
  const name = values.name.trim();
  const code = values.code.trim();

  if (!values.brand) errors.brand = "Choose a brand.";
  if (!name) errors.name = "Enter a recipe name.";
  else if (name.length > RECIPE_LIMITS.name) errors.name = `Keep it to ${RECIPE_LIMITS.name} characters.`;
  if (!code) errors.code = "Enter a code.";
  else if (code.length > RECIPE_LIMITS.code) errors.code = `Keep it to ${RECIPE_LIMITS.code} characters.`;
  else if (takenCodes.has(code.toUpperCase())) errors.code = "Another recipe already uses this code.";
  if (values.notes.trim().length > RECIPE_LIMITS.notes) errors.notes = `Keep it to ${RECIPE_LIMITS.notes} characters.`;

  const ingredient: NonNullable<RecipeFormErrors["ingredient"]> = {};
  const seen = new Set<string>();
  const filled = values.ingredients.filter((i) => !isBlankIngredient(i));
  for (const row of filled) {
    const problems: Partial<Record<IngredientField, string>> = {};
    const rowName = row.name.trim();
    const quantity = parseQuantity(row.quantity);
    if ("error" in quantity) problems.quantity = quantity.error;
    if (!unitCodes.has(row.unit)) problems.unit = "Choose a unit.";
    if (!rowName) problems.name = "Name the ingredient.";
    else if (rowName.length > RECIPE_LIMITS.ingredientName)
      problems.name = `Keep it to ${RECIPE_LIMITS.ingredientName} characters.`;
    // Same rule as the API: names are unique per recipe, ignoring case and spacing.
    else if (seen.has(rowName.toLowerCase())) problems.name = "Already listed above.";
    if (rowName) seen.add(rowName.toLowerCase());
    if (Object.keys(problems).length > 0) ingredient[row.key] = problems;
  }
  if (filled.length === 0) errors.ingredients = "Add at least one ingredient.";
  if (Object.keys(ingredient).length > 0) errors.ingredient = ingredient;

  const step: Record<string, string> = {};
  const steps = values.steps.filter((s) => !isBlankStep(s));
  for (const row of steps) {
    if (row.instruction.trim().length > RECIPE_LIMITS.instruction)
      step[row.key] = `Keep each step to ${RECIPE_LIMITS.instruction} characters.`;
  }
  if (steps.length === 0) errors.steps = "Add at least one step.";
  if (Object.keys(step).length > 0) errors.step = step;

  return errors;
}

/** How many separate things need fixing, for the summary beside the save button. */
export function countProblems(errors: RecipeFormErrors): number {
  const { ingredient = {}, step = {}, ...fields } = errors;
  const rowProblems = Object.values(ingredient).reduce((n, row) => n + Object.keys(row).length, 0);
  return Object.keys(fields).length + rowProblems + Object.keys(step).length;
}

/** Element ids, in the order the form shows them. Rows and steps share these with the editors. */
export const recipeFieldId = {
  brand: "recipe-brand",
  name: "recipe-name",
  code: "recipe-code",
  notes: "recipe-notes",
  ingredient: (key: string, field: IngredientField | "note") => `${key}-${field}`,
  step: (key: string) => `${key}-instruction`,
};

/** Where focus should go after a failed save: the first problem in reading order. */
export function firstProblemId(values: RecipeFormValues, errors: RecipeFormErrors): string | null {
  if (errors.brand) return recipeFieldId.brand;
  if (errors.name) return recipeFieldId.name;
  if (errors.code) return recipeFieldId.code;
  if (errors.ingredients) return recipeFieldId.ingredient(values.ingredients[0].key, "quantity");
  for (const row of values.ingredients) {
    const problems = errors.ingredient?.[row.key];
    if (!problems) continue;
    const field = (["quantity", "unit", "name"] as const).find((f) => problems[f]);
    if (field) return recipeFieldId.ingredient(row.key, field);
  }
  if (errors.steps) return recipeFieldId.step(values.steps[0].key);
  const step = values.steps.find((s) => errors.step?.[s.key]);
  if (step) return recipeFieldId.step(step.key);
  if (errors.notes) return recipeFieldId.notes;
  return null;
}

/** The POST /recipes body (CreateFullRecipeDTO). Call only once validateRecipeForm finds nothing. */
export type CreateRecipePayload = {
  brand_id: string;
  code: string;
  name: string;
  formulation_notes: string | null;
  ingredients: { ingredient_name: string; quantity: number; unit_code: string; note: string | null }[];
  steps: { step_no: number; instruction: string }[];
};

type IngredientPayload = CreateRecipePayload["ingredients"][number];

function toIngredientPayload(row: IngredientDraft): IngredientPayload {
  const quantity = parseQuantity(row.quantity);
  if ("error" in quantity) throw new Error(`Invalid quantity for ${row.name}: ${quantity.error}`);
  return {
    ingredient_name: row.name.trim(),
    quantity: quantity.value,
    unit_code: row.unit,
    note: row.note.trim() || null,
  };
}

export function toCreateRecipePayload(values: RecipeFormValues, brandId: string): CreateRecipePayload {
  return {
    brand_id: brandId,
    code: values.code.trim(),
    name: values.name.trim(),
    formulation_notes: values.notes.trim() || null,
    ingredients: values.ingredients.filter((i) => !isBlankIngredient(i)).map(toIngredientPayload),
    // Numbered by their order on screen.
    steps: values.steps
      .filter((s) => !isBlankStep(s))
      .map((s, i) => ({ step_no: i + 1, instruction: s.instruction.trim() })),
  };
}

/** What the static page adds to its list: version 1, active, and not on any menu yet. */
export function toNewRecipeDetail(id: string, brand: MenuBrand, payload: CreateRecipePayload, now: Date): RecipeDetail {
  const at = now.toISOString();
  return {
    id,
    code: payload.code,
    name: payload.name,
    brand,
    version: 1,
    active: true,
    createdAt: at,
    modifiedAt: at,
    ingredients: payload.ingredients.map((i, n) => ({
      id: `${id}-ing-${n + 1}`,
      name: i.ingredient_name,
      // As the API sends a Decimal(12, 3) back.
      quantity: i.quantity.toFixed(3),
      unit: i.unit_code,
      note: i.note,
    })),
    steps: payload.steps.map((s) => ({ id: `${id}-step-${s.step_no}`, number: s.step_no, instruction: s.instruction })),
    formulationNotes: payload.formulation_notes,
    usedBy: [],
  };
}

/**
 * The form filled in with a recipe, for editing. Existing rows keep the API's ids
 * as their keys, which is how the update payload tells edits from additions.
 */
export function toRecipeFormValues(recipe: RecipeDetail): RecipeFormValues {
  return {
    brand: recipe.brand.code,
    name: recipe.name,
    code: recipe.code,
    notes: recipe.formulationNotes ?? "",
    ingredients:
      recipe.ingredients.length > 0
        ? recipe.ingredients.map((i) => ({
            key: i.id,
            name: i.name,
            quantity: formatQuantity(i.quantity),
            unit: i.unit,
            note: i.note ?? "",
          }))
        : [{ ...newIngredientDraft(), key: "ingredient-0" }],
    steps:
      recipe.steps.length > 0
        ? recipe.steps.map((s) => ({ key: s.id, instruction: s.instruction }))
        : [{ ...newStepDraft(), key: "step-0" }],
  };
}

type Mutations<Create, Update> = { create?: Create[]; update?: Update[]; delete?: string[] };
type IngredientUpdate = Partial<IngredientPayload> & { recipe_ingredient_id: string };
type StepPayload = CreateRecipePayload["steps"][number];
type StepUpdate = { recipe_step_id: string; step_no?: number; instruction?: string };

/**
 * The PATCH /recipes/:id body (UpdateFullRecipeDTO): only what changed. Brand
 * isn't in it because the API doesn't let a recipe change brand.
 */
export type UpdateRecipePayload = {
  code?: string;
  name?: string;
  formulation_notes?: string | null;
  ingredients?: Mutations<IngredientPayload, IngredientUpdate>;
  steps?: Mutations<StepPayload, StepUpdate>;
};

// Leaves out empty lists, and the whole group when nothing in it changed.
function mutations<C, U>(create: C[], update: U[], remove: string[]): Mutations<C, U> | undefined {
  const result: Mutations<C, U> = {};
  if (create.length > 0) result.create = create;
  if (update.length > 0) result.update = update;
  if (remove.length > 0) result.delete = remove;
  return Object.keys(result).length > 0 ? result : undefined;
}

/** Call only once validateRecipeForm finds nothing. An empty object means nothing changed. */
export function toUpdateRecipePayload(recipe: RecipeDetail, values: RecipeFormValues): UpdateRecipePayload {
  const payload: UpdateRecipePayload = {};
  const name = values.name.trim();
  const code = values.code.trim();
  const notes = values.notes.trim() || null;
  if (name !== recipe.name) payload.name = name;
  if (code !== recipe.code) payload.code = code;
  if (notes !== recipe.formulationNotes) payload.formulation_notes = notes;

  // A row cleared to blank counts as removed, as blank rows are left out on the add form.
  const rows = values.ingredients.filter((i) => !isBlankIngredient(i));
  const keptRows = new Set(rows.map((row) => row.key));
  const originalIngredients = new Map(recipe.ingredients.map((i) => [i.id, i]));
  const ingredientUpdates: IngredientUpdate[] = [];
  for (const row of rows) {
    const original = originalIngredients.get(row.key);
    if (!original) continue;
    const next = toIngredientPayload(row);
    const changes: Partial<IngredientPayload> = {};
    if (next.ingredient_name !== original.name) changes.ingredient_name = next.ingredient_name;
    if (next.quantity !== Number(original.quantity)) changes.quantity = next.quantity;
    if (next.unit_code !== original.unit) changes.unit_code = next.unit_code;
    if (next.note !== original.note) changes.note = next.note;
    if (Object.keys(changes).length > 0) ingredientUpdates.push({ recipe_ingredient_id: original.id, ...changes });
  }
  const ingredients = mutations(
    rows.filter((row) => !originalIngredients.has(row.key)).map(toIngredientPayload),
    ingredientUpdates,
    recipe.ingredients.filter((i) => !keptRows.has(i.id)).map((i) => i.id),
  );
  if (ingredients) payload.ingredients = ingredients;

  // Every step is numbered by its place on screen, so the numbers the API sorts by never collide.
  const steps = values.steps.filter((s) => !isBlankStep(s));
  const keptSteps = new Set(steps.map((s) => s.key));
  const originalSteps = new Map(recipe.steps.map((s) => [s.id, s]));
  const stepCreates: StepPayload[] = [];
  const stepUpdates: StepUpdate[] = [];
  steps.forEach((row, index) => {
    const stepNo = index + 1;
    const instruction = row.instruction.trim();
    const original = originalSteps.get(row.key);
    if (!original) {
      stepCreates.push({ step_no: stepNo, instruction });
      return;
    }
    const changes: Omit<StepUpdate, "recipe_step_id"> = {};
    if (stepNo !== original.number) changes.step_no = stepNo;
    if (instruction !== original.instruction) changes.instruction = instruction;
    if (Object.keys(changes).length > 0) stepUpdates.push({ recipe_step_id: original.id, ...changes });
  });
  const stepMutations = mutations(
    stepCreates,
    stepUpdates,
    recipe.steps.filter((s) => !keptSteps.has(s.id)).map((s) => s.id),
  );
  if (stepMutations) payload.steps = stepMutations;

  return payload;
}

/** The API refuses an edit with no changes (NO_RECIPE_CHANGES), since it would still add a version. */
export const hasRecipeChanges = (payload: UpdateRecipePayload) => Object.keys(payload).length > 0;

/** What the static page saves: the recipe as edited, one version up. */
export function toEditedRecipeDetail(recipe: RecipeDetail, values: RecipeFormValues, now: Date): RecipeDetail {
  const version = recipe.version + 1;
  const known = new Set([...recipe.ingredients.map((i) => i.id), ...recipe.steps.map((s) => s.id)]);
  // New rows get ids of their own, as the API would assign.
  const idFor = (key: string) => (known.has(key) ? key : `${recipe.id}-v${version}-${key}`);
  return {
    ...recipe,
    name: values.name.trim(),
    code: values.code.trim(),
    formulationNotes: values.notes.trim() || null,
    version,
    modifiedAt: now.toISOString(),
    ingredients: values.ingredients
      .filter((i) => !isBlankIngredient(i))
      .map((row) => {
        const payload = toIngredientPayload(row);
        return {
          id: idFor(row.key),
          name: payload.ingredient_name,
          // As the API sends a Decimal(12, 3) back.
          quantity: payload.quantity.toFixed(3),
          unit: payload.unit_code,
          note: payload.note,
        };
      }),
    steps: values.steps
      .filter((s) => !isBlankStep(s))
      .map((row, index) => ({ id: idFor(row.key), number: index + 1, instruction: row.instruction.trim() })),
  };
}
