"use client";

import { Archive } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import PageTitle from "@/src/features/dashboard/components/atoms/page-title";
import BackLink from "../components/atoms/back-link";
import RecipeForm from "../components/organisms/recipe-form";
import RecipeNotFound from "../components/organisms/recipe-not-found";
import { useRecipe } from "../hooks/useRecipe";
import { useRecipeBrands } from "../hooks/useRecipeBrands";
import { useUpdateRecipe } from "../hooks/useRecipeMutations";
import { isNotFound, recipeSaveError } from "../utils/recipe-errors";
import {
  hasRecipeChanges,
  toRecipeFormValues,
  toUpdateRecipePayload,
  type RecipeFormValues,
} from "../utils/recipe-form";
import { toRecipe, type RecipeDetail } from "../utils/recipes";

// The add form, filled in. Saving is one PATCH /recipes/:id carrying only what
// changed; the API bumps the version and keeps the old one in the history.
export default function EditRecipe({ id }: { id: string }) {
  const router = useRouter();
  const { recipe, ingredients, steps } = useRecipe(id, { canManage: true });
  const brands = useRecipeBrands();
  const update = useUpdateRecipe(id);

  if (recipe.error && isNotFound(recipe.error)) return <RecipeNotFound />;

  const record = recipe.data;
  const recipeHref = `/dashboard/recipes/${id}`;
  const back = <BackLink href={recipeHref} label={record?.name ?? "Recipe"} />;
  const shell = (body: ReactNode) => (
    <section className="motion-safe:animate-page-in">
      {back}
      <div className="mt-2">
        <PageTitle>Edit recipe</PageTitle>
      </div>
      {body}
    </section>
  );

  // The API only edits active recipes.
  if (record && !record.is_active) {
    return shell(
      <div className="mt-6 flex max-w-xl items-start gap-4 rounded-xl border border-hairline bg-card px-5 py-5">
        <Archive aria-hidden="true" strokeWidth={1.75} className="mt-0.5 size-6 shrink-0 text-ink-muted" />
        <div className="flex flex-col gap-1.5">
          <h2 className="text-base font-semibold text-ink">{record.name} is inactive</h2>
          <p className="text-sm leading-relaxed text-ink-muted">Reactivate it from its page to make changes.</p>
          <Link
            href={recipeHref}
            className="mt-2 w-fit rounded-md text-sm font-semibold text-primary-ink underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Go to the recipe
          </Link>
        </div>
      </div>,
    );
  }

  // The form starts from the saved recipe, so it waits for every part of it.
  const error = recipe.error ?? ingredients.error ?? steps.error ?? brands.error;
  if (error) {
    return shell(
      <div role="alert" className="mt-6 max-w-xl rounded-xl border border-hairline bg-card px-5 py-5">
        <p className="text-sm text-ink">Unable to load the recipe to edit. {error.message}</p>
        <Button
          variant="outline"
          size="lg"
          className="mt-3 h-10 px-4 font-semibold"
          onClick={() => {
            void recipe.refetch();
            void ingredients.refetch();
            void steps.refetch();
          }}
        >
          Try again
        </Button>
      </div>,
    );
  }
  if (!record || !ingredients.data || !steps.data || brands.isPending) {
    return shell(
      <p role="status" className="mt-6 text-sm text-ink-muted">
        Loading recipe…
      </p>,
    );
  }

  const detail: RecipeDetail = {
    ...toRecipe(record, brands.brandFor(record.brand_id)),
    ingredients: ingredients.data,
    steps: steps.data,
    formulationNotes: record.formulation_notes ?? null,
    usedBy: [],
  };

  const save = async (values: RecipeFormValues) => {
    const payload = toUpdateRecipePayload(detail, values);
    if (!hasRecipeChanges(payload)) return { message: "Nothing has changed yet.", tone: "info" as const };
    try {
      await update.mutateAsync(payload);
      router.push(recipeHref);
      return undefined;
    } catch (failure) {
      return recipeSaveError(failure);
    }
  };

  return (
    <RecipeForm
      // A newer version from elsewhere starts the form over rather than mixing the two.
      key={`${detail.id}-v${detail.version}`}
      header={
        <>
          {back}
          <header className="mt-2">
            <PageTitle>Edit recipe</PageTitle>
            <p className="mt-1 text-sm text-ink-muted">
              Saving makes this version {detail.version + 1}. Version {detail.version} stays in the history.
            </p>
          </header>
        </>
      }
      initialValues={toRecipeFormValues(detail)}
      suggestCode={false}
      brands={[]}
      lockedBrand={detail.brand}
      submitLabel="Save changes"
      savePhrase="save your changes"
      cancelHref={recipeHref}
      onSave={save}
    />
  );
}
