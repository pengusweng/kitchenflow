"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getModifiers } from "@/src/features/modifiers/services/modifiers.service";
import { getRecipes } from "@/src/features/recipes/services/recipes.service";
import { getMenu, type GetMenuParams } from "../services/menu.service";
import type { MenuModifierOption } from "../utils/menu";

export const menuKeys = {
  all: ["menu"] as const,
  lists: ["menu", "list"] as const,
  list: (params: GetMenuParams) => ["menu", "list", params] as const,
};

/** One page of the menu table. The previous page stays shown (isPlaceholderData) until the next arrives. */
export function useMenu(params: GetMenuParams) {
  return useQuery({
    queryKey: menuKeys.list(params),
    queryFn: ({ signal }) => getMenu(params, signal),
    placeholderData: keepPreviousData,
    retry: false,
  });
}

// The API pages at most 100 at a time; a brand's recipes and the shared
// modifiers sit far below that, so one page is the whole list.
const PICKER_LIMIT = 100;

/** A brand's active recipes, for the recipe picker; off until a brand is picked. */
export function useBrandRecipes(brandId: string | undefined) {
  const query = useQuery({
    queryKey: ["recipes", "picker", brandId ?? ""],
    queryFn: ({ signal }) =>
      getRecipes(
        {
          page: 1,
          limit: PICKER_LIMIT,
          status: "active",
          brandId,
          sortBy: "name",
          sortOrder: "asc",
        },
        signal,
      ),
    enabled: Boolean(brandId),
    staleTime: 60_000,
    retry: false,
  });
  return {
    recipes: (query.data?.data ?? []).map((r) => ({
      id: r.recipe_id,
      name: r.name,
    })),
    isPending: Boolean(brandId) && query.isPending,
    error: query.error,
  };
}

/** Every active modifier, for the add-a-modifier picker. */
export function useModifierOptions() {
  const query = useQuery({
    queryKey: ["modifiers", "picker"],
    queryFn: ({ signal }) =>
      getModifiers(
        {
          page: 1,
          limit: PICKER_LIMIT,
          status: "active",
          sortBy: "name",
          sortOrder: "asc",
        },
        signal,
      ),
    staleTime: 60_000,
    retry: false,
  });
  const options: MenuModifierOption[] = (query.data?.data ?? []).map((m) => ({
    id: m.modifier_id,
    code: m.code,
    name: m.name,
    description: m.description,
  }));
  return { options, isPending: query.isPending, error: query.error };
}
