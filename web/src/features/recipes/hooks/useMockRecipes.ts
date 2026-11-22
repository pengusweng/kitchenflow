"use client";

import { useSyncExternalStore } from "react";
import { MOCK_RECIPE_DETAILS } from "../utils/mock-recipes";
import type { RecipeDetail } from "../utils/recipes";

// Placeholder store until the recipes API is wired up. The table, the recipe
// page and the add form all read this one list, so a recipe added on the form
// shows in both; like the menu page, additions last until the page reloads.
let recipes: RecipeDetail[] = MOCK_RECIPE_DETAILS;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => recipes;
// The server only ever renders the seeded list.
const getServerSnapshot = () => MOCK_RECIPE_DETAILS;

export function useMockRecipes(): RecipeDetail[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function addMockRecipe(recipe: RecipeDetail) {
  recipes = [recipe, ...recipes];
  listeners.forEach((listener) => listener());
}
