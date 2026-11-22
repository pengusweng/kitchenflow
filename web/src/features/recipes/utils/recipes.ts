import type { TableSort } from "@/src/lib/table-sort";
import type { MenuBrand } from "@/src/features/menu/utils/menu";

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

export type RecipeFilters = {
  search: string;
  /** Brand code; undefined means every brand. */
  brand: string | undefined;
  /** Undefined means active and inactive. */
  status: RecipeStatusFilter | undefined;
};

export const RECIPES_PAGE_SIZE = 20;

const date = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" });

/** e.g. "Nov 20, 2026" in Manila time. */
export function formatRecipeDate(iso: string) {
  return date.format(new Date(iso));
}

// Same rule as the API: every space-separated term must match the name or the code.
function matchesSearch(recipe: Recipe, search: string) {
  const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = [recipe.name.toLowerCase(), recipe.code.toLowerCase()];
  return terms.every((term) => haystack.some((field) => field.includes(term)));
}

function matchesStatus(recipe: Recipe, status: RecipeStatusFilter | undefined) {
  if (!status) return true;
  return status === "active" ? recipe.active : !recipe.active;
}

function compare(a: Recipe, b: Recipe, sort: RecipeSort) {
  if (!sort) return b.modifiedAt.localeCompare(a.modifiedAt) || a.name.localeCompare(b.name);
  const direction = sort.order === "asc" ? 1 : -1;
  const primary =
    sort.by === "name" ? a.name.localeCompare(b.name) : a.modifiedAt.localeCompare(b.modifiedAt);
  return primary * direction || a.name.localeCompare(b.name);
}

/** The rows the table shows, in the chosen order. */
export function filterRecipes(recipes: Recipe[], filters: RecipeFilters, sort: RecipeSort) {
  return recipes
    .filter(
      (recipe) =>
        matchesSearch(recipe, filters.search) &&
        matchesStatus(recipe, filters.status) &&
        (!filters.brand || recipe.brand.code === filters.brand),
    )
    .sort((a, b) => compare(a, b, sort));
}
