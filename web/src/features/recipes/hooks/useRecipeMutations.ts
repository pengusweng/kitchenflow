"use client";

import { useMutation, useQueryClient, type Query } from "@tanstack/react-query";
import { createRecipe, deactivateRecipe, reactivateRecipe, updateRecipe } from "../services/recipes.service";
import type { CreateRecipePayload, UpdateRecipePayload } from "../utils/recipe-form";
import { recipeKeys } from "./useRecipe";

// After any change the list, the recipe and its history are stale, so they all reload.
function useInvalidateRecipes() {
  const queryClient = useQueryClient();
  return (skip?: (query: Query) => boolean) =>
    queryClient.invalidateQueries({ queryKey: recipeKeys.all, predicate: skip ? (query) => !skip(query) : undefined });
}

export function useCreateRecipe() {
  const invalidate = useInvalidateRecipes();
  return useMutation({
    mutationFn: (payload: CreateRecipePayload) => createRecipe(payload),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateRecipe(id: string) {
  const invalidate = useInvalidateRecipes();
  return useMutation({
    mutationFn: (payload: UpdateRecipePayload) => updateRecipe(id, payload),
    onSuccess: () => invalidate(),
  });
}

export function useSetRecipeActive(id: string) {
  const invalidate = useInvalidateRecipes();
  return useMutation({
    mutationFn: (active: boolean) => (active ? reactivateRecipe(id) : deactivateRecipe(id)),
    // The API refuses an inactive recipe's ingredients and steps, so a deactivated
    // recipe doesn't ask again; its page reads them from the history instead.
    onSuccess: (_result, active) =>
      invalidate(
        active
          ? undefined
          : (query) => {
              const [, , recipeId, part] = query.queryKey;
              return recipeId === id && (part === "ingredients" || part === "steps");
            },
      ),
  });
}
