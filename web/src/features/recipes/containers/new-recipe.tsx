"use client";

import { useRouter, useSearchParams } from "next/navigation";
import PageTitle from "@/src/features/dashboard/components/atoms/page-title";
import BackLink from "../components/atoms/back-link";
import RecipeForm from "../components/organisms/recipe-form";
import { useRecipeBrands } from "../hooks/useRecipeBrands";
import { useCreateRecipe } from "../hooks/useRecipeMutations";
import { recipeSaveError } from "../utils/recipe-errors";
import { emptyRecipeForm, toCreateRecipePayload, type RecipeFormValues } from "../utils/recipe-form";

// POST /recipes creates the recipe with its ingredients and steps in one go,
// then the page opens the new recipe.
export default function NewRecipe() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const brands = useRecipeBrands();
  const create = useCreateRecipe();

  const header = (
    <>
      <BackLink />
      <header className="mt-2">
        <PageTitle>New recipe</PageTitle>
        <p className="mt-1 text-sm text-ink-muted">
          Starts active at version 1. Menu items can link to it once it&apos;s added.
        </p>
      </header>
    </>
  );

  // The form starts on the ?brand= brand, so it waits for the brand list.
  if (brands.isPending || brands.error) {
    return (
      <section className="motion-safe:animate-page-in">
        {header}
        <p role={brands.error ? "alert" : "status"} className="mt-6 text-sm text-ink-muted">
          {brands.error ? `Unable to load brands. ${brands.error.message}` : "Loading brands…"}
        </p>
      </section>
    );
  }

  const brandParam = searchParams.get("brand")?.toUpperCase() ?? "";
  const startBrand = brands.activeBrands.some((b) => b.code === brandParam) ? brandParam : "";

  const save = async (values: RecipeFormValues) => {
    const brand = brands.activeBrands.find((b) => b.code === values.brand);
    if (!brand) return { message: "Choose a brand." };
    try {
      const saved = await create.mutateAsync(toCreateRecipePayload(values, brand.id));
      router.push(`/dashboard/recipes/${saved.recipe_id}`);
      return undefined;
    } catch (error) {
      return recipeSaveError(error);
    }
  };

  return (
    <RecipeForm
      header={header}
      initialValues={emptyRecipeForm(startBrand)}
      suggestCode
      brands={brands.activeBrands}
      submitLabel="Add recipe"
      savePhrase="add this recipe"
      cancelHref="/dashboard/recipes"
      onSave={save}
    />
  );
}
