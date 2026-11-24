import { z } from "zod";
import { ApiError } from "@/src/lib/api-error";
import {
  authoredRecipeSchema,
  ingredientRecordSchema,
  recipeHistorySchema,
  recipeMenuItemsSchema,
  recipeRecordSchema,
  recipesPageSchema,
  recipeStatusSchema,
  stepRecordSchema,
} from "../schemas/recipeSchema";
import type { CreateRecipePayload, UpdateRecipePayload } from "../utils/recipe-form";
import type { RecipeSortField, RecipeStatusFilter } from "../utils/recipes";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Shown when the API sends no message of its own. */
  fallback: string;
  signal?: AbortSignal;
};

// Every recipe call: JSON in and out, a 10 s limit, ApiError on failure, and
// the response checked against its schema before anything renders it.
async function request<S extends z.ZodType>(path: string, schema: S, options: RequestOptions): Promise<z.infer<S>> {
  const { method = "GET", body, fallback, signal } = options;
  const timeout = AbortSignal.timeout(10_000);
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw ApiError.network();
  }

  if (!response.ok) throw await ApiError.fromResponse(response, fallback);
  const result = schema.safeParse(await response.json().catch(() => null));
  if (!result.success) throw new ApiError(response.status, undefined, "The server sent something unexpected. Please try again.");
  return result.data;
}

export type GetRecipesParams = {
  page: number;
  limit: number;
  status: RecipeStatusFilter | "all";
  search?: string;
  brandId?: string;
  sortBy: RecipeSortField;
  sortOrder: "asc" | "desc";
};

export function getRecipes(params: GetRecipesParams, signal?: AbortSignal) {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    status: params.status,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });
  if (params.search) query.set("search", params.search);
  if (params.brandId) query.set("brand_id", params.brandId);
  return request(`/recipes?${query}`, recipesPageSchema, { fallback: "Unable to load recipes. Please try again.", signal });
}

const recipePath = (id: string) => encodeURIComponent(id);

export function getRecipe(id: string, signal?: AbortSignal) {
  return request(`/recipes/${recipePath(id)}`, recipeRecordSchema, {
    fallback: "Unable to load the recipe. Please try again.",
    signal,
  });
}

/** Active recipes only: the API refuses an inactive recipe's ingredients. */
export function getRecipeIngredients(id: string, signal?: AbortSignal) {
  return request(`/recipe-ingredients/recipe/${recipePath(id)}`, z.array(ingredientRecordSchema), {
    fallback: "Unable to load the ingredients. Please try again.",
    signal,
  });
}

/** Active recipes only, and only for recipe managers and superadmins. */
export function getRecipeSteps(id: string, signal?: AbortSignal) {
  return request(`/recipe-steps/recipe/${recipePath(id)}`, z.array(stepRecordSchema), {
    fallback: "Unable to load the steps. Please try again.",
    signal,
  });
}

/** Recipe managers and superadmins; newest version first. */
export function getRecipeHistory(id: string, signal?: AbortSignal) {
  return request(`/recipe-histories/recipe/${recipePath(id)}`, z.array(recipeHistorySchema), {
    fallback: "Unable to load the history. Please try again.",
    signal,
  });
}

/** One page of the menu items made from the recipe; `meta.total` says how many there are in all. */
export function getRecipeMenuItems(id: string, signal?: AbortSignal) {
  const query = new URLSearchParams({ recipe_id: id, status: "all", limit: "100" });
  return request(`/menu-items?${query}`, recipeMenuItemsSchema, {
    fallback: "Unable to load the menu items. Please try again.",
    signal,
  });
}

export function createRecipe(payload: CreateRecipePayload) {
  return request("/recipes", authoredRecipeSchema, {
    method: "POST",
    body: payload,
    fallback: "Unable to add the recipe. Please try again.",
  });
}

export function updateRecipe(id: string, payload: UpdateRecipePayload) {
  return request(`/recipes/${recipePath(id)}`, authoredRecipeSchema, {
    method: "PATCH",
    body: payload,
    fallback: "Unable to save the changes. Please try again.",
  });
}

export function deactivateRecipe(id: string) {
  return request(`/recipes/${recipePath(id)}`, recipeStatusSchema, {
    method: "DELETE",
    fallback: "Unable to deactivate the recipe. Please try again.",
  });
}

export function reactivateRecipe(id: string) {
  return request(`/recipes/${recipePath(id)}/reactivate`, recipeStatusSchema, {
    method: "PATCH",
    fallback: "Unable to reactivate the recipe. Please try again.",
  });
}
