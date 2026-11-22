"use client";

import { useSyncExternalStore } from "react";
import { MOCK_RECIPE_DETAILS, MOCK_RECIPE_HISTORIES } from "../utils/mock-recipes";
import { snapshotOf, type RecipeVersion } from "../utils/recipe-history";
import type { RecipeDetail } from "../utils/recipes";

// Placeholder store until the recipes API is wired up. The table, the recipe
// page and the add and edit forms all read this one list, so a change on one
// shows on the others; like the menu page, changes last until the page reloads.
let recipes: RecipeDetail[] = MOCK_RECIPE_DETAILS;
// Each recipe's saved versions, oldest first, as GET recipe history would return them.
let histories: Record<string, RecipeVersion[]> = MOCK_RECIPE_HISTORIES;
const listeners = new Set<() => void>();
const NO_VERSIONS: RecipeVersion[] = [];

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const notify = () => listeners.forEach((listener) => listener());

export function useMockRecipes(): RecipeDetail[] {
  // The server only ever renders the seeded list.
  return useSyncExternalStore(subscribe, () => recipes, () => MOCK_RECIPE_DETAILS);
}

export function useMockRecipeHistory(id: string): RecipeVersion[] {
  return useSyncExternalStore(
    subscribe,
    () => histories[id] ?? NO_VERSIONS,
    () => MOCK_RECIPE_HISTORIES[id] ?? NO_VERSIONS,
  );
}

/** A new recipe starts at version 1, which is also its first history entry. */
export function addMockRecipe(recipe: RecipeDetail) {
  recipes = [recipe, ...recipes];
  histories = { ...histories, [recipe.id]: [snapshotOf(recipe)] };
  notify();
}

/** An edit: the recipe as saved, one version up, joins its history like PATCH /recipes/:id. */
export function saveMockRecipe(recipe: RecipeDetail) {
  recipes = recipes.map((r) => (r.id === recipe.id ? recipe : r));
  histories = { ...histories, [recipe.id]: [...(histories[recipe.id] ?? []), snapshotOf(recipe)] };
  notify();
}

/** Deactivating or reactivating keeps the version and adds no history, as the API does. */
export function setMockRecipeActive(id: string, active: boolean) {
  const now = new Date().toISOString();
  recipes = recipes.map((r) => (r.id === id ? { ...r, active, modifiedAt: now } : r));
  notify();
}
