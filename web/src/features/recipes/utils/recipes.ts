import type { BrandResponse } from "@/src/features/brands/schemas/brandSchema";
import type { MenuBrand } from "@/src/features/menu/utils/menu";
import type { TableSort } from "@/src/lib/table-sort";
import type {
  IngredientRecord,
  RecipeHistoryRecord,
  RecipeMenuItems,
  RecipeRecord,
  StepRecord,
} from "../schemas/recipeSchema";
import type { RecipeVersion } from "./recipe-history";

/** A row of the recipes table. */
export type Recipe = {
  id: string;
  code: string;
  name: string;
  brand: MenuBrand;
  /** Goes up by one each time the recipe is edited. */
  version: number;
  /** Inactive recipes are retired: menu items can't be linked to them. */
  active: boolean;
  /** ISO timestamps, as the API sends them. */
  createdAt: string;
  modifiedAt: string;
};

export type RecipeIngredient = {
  id: string;
  name: string;
  /** As the API sends it, e.g. "250.000". Show it with formatQuantity. */
  quantity: string;
  /** Unit code, e.g. "g", "ml", "tbsp", "pc". */
  unit: string;
  note: string | null;
};

export type RecipeStep = { id: string; number: number; instruction: string };

/** A menu item linked to the recipe. */
export type RecipeUse = { id: string; name: string; code: string; active: boolean };

/** Everything the recipe page shows. */
export type RecipeDetail = Recipe & {
  ingredients: RecipeIngredient[];
  /** In step order. */
  steps: RecipeStep[];
  /** Confidential: only recipe managers and superadmins receive it. */
  formulationNotes: string | null;
  usedBy: RecipeUse[];
};

/** "250.000" → "250", "0.500" → "0.5". The API keeps three decimals on every quantity. */
export function formatQuantity(quantity: string) {
  const value = Number(quantity);
  return Number.isFinite(value) ? String(value) : quantity;
}

export type RecipeStatusFilter = "active" | "inactive";
export type RecipeSortField = "name" | "modified_at";
/** null means the API default: most recently updated first. */
export type RecipeSort = TableSort<RecipeSortField>;

export const RECIPES_PAGE_SIZE = 20;

const date = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" });

/** e.g. "Nov 20, 2026" in Manila time. */
export function formatRecipeDate(iso: string) {
  return date.format(new Date(iso));
}

// The API has no brand colours, so each brand gets one of these by its code:
// muted, distinct on light and dark, and the same on every page.
const BRAND_ACCENTS = ["#3D5A80", "#9A4A1F", "#5C4033", "#2F6B4F", "#6B4C8A", "#8A6A12", "#7A3B4E", "#2C6E7F"];

export function brandAccent(code: string) {
  let hash = 0;
  for (const char of code) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return BRAND_ACCENTS[hash % BRAND_ACCENTS.length];
}

// Brand codes are CHAR(4), so the database pads short ones ("GC  ").
export function toRecipeBrand(brand: BrandResponse): MenuBrand {
  const code = brand.code.trim();
  return { id: brand.brand_id, code, name: brand.name, accent: brandAccent(code) };
}

/** For a recipe whose brand isn't in the loaded list. */
export function unknownBrand(id: string): MenuBrand {
  return { id, code: "", name: "Unknown brand", accent: "#8A94A6" };
}

export function toRecipe(record: RecipeRecord, brand: MenuBrand): Recipe {
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

export function toIngredient(record: IngredientRecord): RecipeIngredient {
  return {
    id: record.recipe_ingredient_id,
    name: record.ingredient_name,
    quantity: record.quantity,
    unit: record.unit_code,
    note: record.note,
  };
}

/** In step order, whatever order they arrive in. */
export function toSteps(records: StepRecord[]): RecipeStep[] {
  return [...records]
    .sort((a, b) => a.step_no - b.step_no)
    .map((s) => ({ id: s.recipe_step_id, number: s.step_no, instruction: s.instruction }));
}

export function toRecipeVersion(record: RecipeHistoryRecord): RecipeVersion {
  return {
    version: record.version,
    savedAt: record.created_at,
    name: record.recipe_snapshot.name,
    code: record.recipe_snapshot.code,
    ingredients: record.ingredients_snapshot.map(toIngredient),
    steps: toSteps(record.steps_snapshot),
    formulationNotes: record.recipe_snapshot.formulation_notes ?? null,
  };
}

export function toRecipeUses(page: RecipeMenuItems): RecipeUse[] {
  return page.data.map((item) => ({ id: item.menu_item_id, name: item.name, code: item.code, active: item.is_active }));
}
