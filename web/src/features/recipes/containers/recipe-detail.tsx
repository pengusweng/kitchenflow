"use client";

import { Archive } from "lucide-react";
import BrandLabel from "@/src/components/ui/atoms/brand-label";
import StatusBadge from "@/src/features/brands/components/atoms/status-badge";
import PageTitle from "@/src/features/dashboard/components/atoms/page-title";
import BackLink from "../components/atoms/back-link";
import ConfidentialTag from "../components/atoms/confidential-tag";
import RecipePanel, { PanelEmpty } from "../components/atoms/recipe-panel";
import IngredientList from "../components/molecules/ingredient-list";
import StepList from "../components/molecules/step-list";
import UsedByList from "../components/molecules/used-by-list";
import { useMockRecipes } from "../hooks/useMockRecipes";
import { formatRecipeDate } from "../utils/recipes";

type RecipeDetailProps = {
  id: string;
  /** Recipe managers and superadmins; everyone else never receives the notes. */
  canSeeNotes: boolean;
};

// A recipe as the kitchen reads it: what goes in beside how it's made, then
// the confidential notes and the menu items that depend on it.
export default function RecipeDetail({ id, canSeeNotes }: RecipeDetailProps) {
  // Placeholder data until the recipe, ingredients and steps endpoints are wired
  // up. The API leaves the notes out for other roles; this mock only hides them.
  const recipe = useMockRecipes().find((r) => r.id === id) ?? null;

  if (!recipe) {
    return (
      <section className="motion-safe:animate-page-in">
        <BackLink />
        <div className="mt-3 rounded-xl border border-hairline bg-card px-5 py-8 text-center">
          <PageTitle>Recipe not found</PageTitle>
          <p className="mt-2 text-sm text-ink-muted">It may have been removed, or the link is wrong.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="motion-safe:animate-page-in">
      <BackLink />

      <header className="mt-2">
        <PageTitle>{recipe.name}</PageTitle>
        <p className="mt-1 font-mono text-sm break-words text-ink-muted select-all">{recipe.code}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink">
          <BrandLabel brand={recipe.brand} />
          <span className="text-ink-muted">
            Version <span className="font-semibold text-ink tabular-nums">{recipe.version}</span>
          </span>
          <span className="text-ink-muted">
            Updated{" "}
            <time dateTime={recipe.modifiedAt} className="text-ink">
              {formatRecipeDate(recipe.modifiedAt)}
            </time>
          </span>
          <StatusBadge status={recipe.active ? "active" : "inactive"} />
        </div>
      </header>

      {recipe.active ? null : (
        <p className="mt-5 flex max-w-3xl items-start gap-2.5 rounded-lg bg-surface-hover px-3 py-2.5 text-sm leading-5 text-ink">
          <Archive aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-muted" strokeWidth={2.25} />
          <span>
            <span className="font-semibold">Inactive.</span> Retired, so no menu item can be linked to it. It stays
            here for reference.
          </span>
        </p>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        <div className="grid gap-4">
          <IngredientList ingredients={recipe.ingredients} />
          <UsedByList items={recipe.usedBy} menuHref={`/dashboard/menu?brand=${recipe.brand.code}`} />
        </div>
        <div className="grid gap-4">
          <StepList steps={recipe.steps} />
          {canSeeNotes ? (
            <RecipePanel
              id="recipe-notes-heading"
              title="Formulation notes"
              aside={<ConfidentialTag />}
            >
              {recipe.formulationNotes ? (
                <p className="max-w-[65ch] py-4 text-sm leading-6 whitespace-pre-line text-ink">
                  {recipe.formulationNotes}
                </p>
              ) : (
                <PanelEmpty>No formulation notes.</PanelEmpty>
              )}
            </RecipePanel>
          ) : null}
        </div>
      </div>
    </section>
  );
}
