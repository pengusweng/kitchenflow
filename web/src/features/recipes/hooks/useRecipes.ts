"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getRecipes, type GetRecipesParams } from "../services/recipes.service";

/** One page of the recipes table. The previous page stays shown (isPlaceholderData) until the next arrives. */
export function useRecipes(params: GetRecipesParams, enabled = true) {
  return useQuery({
    queryKey: ["recipes", "list", params],
    queryFn: ({ signal }) => getRecipes(params, signal),
    placeholderData: keepPreviousData,
    enabled,
    retry: false,
  });
}
