"use client";

import { useRouter, useSearchParams } from "next/navigation";
import PageTitle from "@/src/features/dashboard/components/atoms/page-title";
import { MOCK_BRANDS } from "@/src/features/menu/utils/mock-menu";
import BackLink from "../components/atoms/back-link";
import RecipeForm from "../components/organisms/recipe-form";
import { addMockRecipe, useMockRecipes } from "../hooks/useMockRecipes";
import {
  emptyRecipeForm,
  toCreateRecipePayload,
  toNewRecipeDetail,
  type RecipeFormValues,
} from "../utils/recipe-form";

// Static for now: the recipe joins the page's own list and opens on its new page.
export default function NewRecipe() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recipes = useMockRecipes();

  const brandParam = searchParams.get("brand")?.toUpperCase() ?? "";
  const startBrand = MOCK_BRANDS.some((b) => b.code === brandParam) ? brandParam : "";

  const save = (values: RecipeFormValues) => {
    const brand = MOCK_BRANDS.find((b) => b.code === values.brand);
    if (!brand) return "Choose a brand.";
    // Placeholder until POST /recipes is wired: the payload is exactly what it takes.
    const payload = toCreateRecipePayload(values, brand.id);
    const id = `rcp-new-${crypto.randomUUID().slice(0, 8)}`;
    addMockRecipe(toNewRecipeDetail(id, brand, payload, new Date()));
    router.push(`/dashboard/recipes/${id}`);
    return undefined;
  };

  return (
    <RecipeForm
      header={
        <>
          <BackLink />
          <header className="mt-2">
            <PageTitle>New recipe</PageTitle>
            <p className="mt-1 text-sm text-ink-muted">
              Starts active at version 1. Menu items can link to it once it&apos;s added.
            </p>
          </header>
        </>
      }
      initialValues={emptyRecipeForm(startBrand)}
      suggestCode
      takenCodes={new Set(recipes.map((r) => r.code.toUpperCase()))}
      submitLabel="Add recipe"
      savePhrase="add this recipe"
      cancelHref="/dashboard/recipes"
      onSave={save}
    />
  );
}
