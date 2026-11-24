"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getRecipe,
  getRecipeHistory,
  getRecipeIngredients,
  getRecipeMenuItems,
  getRecipeSteps,
} from "../services/recipes.service";
import { toIngredient, toRecipeUses, toRecipeVersion, toSteps } from "../utils/recipes";

export const recipeKeys = {
  all: ["recipes"] as const,
  one: (id: string) => ["recipes", "one", id] as const,
};

type Options = {
  /** Recipe managers and superadmins: they can read the steps and the history. */
  canManage: boolean;
};

/**
 * Everything the recipe page and edit form need, one request each so a part
 * that fails doesn't take the page down with it. The API only lists an active
 * recipe's ingredients and steps; an inactive recipe's are in its history.
 */
export function useRecipe(id: string, { canManage }: Options) {
  const base = recipeKeys.one(id);
  const recipe = useQuery({
    queryKey: base,
    queryFn: ({ signal }) => getRecipe(id, signal),
    retry: false,
  });
  const active = recipe.data?.is_active === true;

  const ingredients = useQuery({
    queryKey: [...base, "ingredients"],
    queryFn: ({ signal }) => getRecipeIngredients(id, signal),
    select: (rows) => rows.map(toIngredient),
    enabled: active,
    retry: false,
  });
  const steps = useQuery({
    queryKey: [...base, "steps"],
    queryFn: ({ signal }) => getRecipeSteps(id, signal),
    select: toSteps,
    enabled: active && canManage,
    retry: false,
  });
  const history = useQuery({
    queryKey: [...base, "history"],
    queryFn: ({ signal }) => getRecipeHistory(id, signal),
    // Oldest first, as the history panel and describeChanges read it.
    select: (rows) => rows.map(toRecipeVersion).sort((a, b) => a.version - b.version),
    enabled: canManage && recipe.isSuccess,
    retry: false,
  });
  const usedBy = useQuery({
    queryKey: [...base, "menu-items"],
    queryFn: ({ signal }) => getRecipeMenuItems(id, signal),
    select: (page) => ({ items: toRecipeUses(page), total: page.meta.total }),
    enabled: recipe.isSuccess,
    retry: false,
  });

  return { recipe, ingredients, steps, history, usedBy };
}
