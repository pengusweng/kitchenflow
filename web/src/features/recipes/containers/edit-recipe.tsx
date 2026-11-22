"use client";

import { Archive } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageTitle from "@/src/features/dashboard/components/atoms/page-title";
import BackLink from "../components/atoms/back-link";
import RecipeForm from "../components/organisms/recipe-form";
import RecipeNotFound from "../components/organisms/recipe-not-found";
import { saveMockRecipe, useMockRecipes } from "../hooks/useMockRecipes";
import {
  hasRecipeChanges,
  toEditedRecipeDetail,
  toRecipeFormValues,
  toUpdateRecipePayload,
  type RecipeFormValues,
} from "../utils/recipe-form";

// The add form, filled in. Saving is one PATCH /recipes/:id carrying only what
// changed; the API bumps the version and keeps the old one in the history.
export default function EditRecipe({ id }: { id: string }) {
  const router = useRouter();
  const recipes = useMockRecipes();
  const recipe = recipes.find((r) => r.id === id);

  if (!recipe) return <RecipeNotFound />;

  const recipeHref = `/dashboard/recipes/${recipe.id}`;
  const back = <BackLink href={recipeHref} label={recipe.name} />;

  // The API only edits active recipes.
  if (!recipe.active) {
    return (
      <section className="motion-safe:animate-page-in">
        {back}
        <div className="mt-2">
          <PageTitle>Edit recipe</PageTitle>
        </div>
        <div className="mt-6 flex max-w-xl items-start gap-4 rounded-xl border border-hairline bg-card px-5 py-5">
          <Archive aria-hidden="true" strokeWidth={1.75} className="mt-0.5 size-6 shrink-0 text-ink-muted" />
          <div className="flex flex-col gap-1.5">
            <h2 className="text-base font-semibold text-ink">{recipe.name} is inactive</h2>
            <p className="text-sm leading-relaxed text-ink-muted">Reactivate it from its page to make changes.</p>
            <Link
              href={recipeHref}
              className="mt-2 w-fit rounded-md text-sm font-semibold text-primary-ink underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              Go to the recipe
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const save = (values: RecipeFormValues) => {
    // Placeholder until PATCH /recipes/:id is wired: the payload is exactly what it takes.
    const payload = toUpdateRecipePayload(recipe, values);
    if (!hasRecipeChanges(payload)) return "Nothing has changed yet.";
    saveMockRecipe(toEditedRecipeDetail(recipe, values, new Date()));
    router.push(recipeHref);
    return undefined;
  };

  return (
    <RecipeForm
      key={recipe.id}
      header={
        <>
          {back}
          <header className="mt-2">
            <PageTitle>Edit recipe</PageTitle>
            <p className="mt-1 text-sm text-ink-muted">
              Saving makes this version {recipe.version + 1}. Version {recipe.version} stays in the history.
            </p>
          </header>
        </>
      }
      initialValues={toRecipeFormValues(recipe)}
      suggestCode={false}
      lockedBrand={recipe.brand}
      takenCodes={new Set(recipes.filter((r) => r.id !== recipe.id).map((r) => r.code.toUpperCase()))}
      submitLabel="Save changes"
      savePhrase="save your changes"
      cancelHref={recipeHref}
      onSave={save}
    />
  );
}
