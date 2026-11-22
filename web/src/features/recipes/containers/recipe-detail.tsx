"use client";

import { Archive, Ban, Pencil, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import BrandLabel from "@/src/components/ui/atoms/brand-label";
import StatusBadge from "@/src/features/brands/components/atoms/status-badge";
import PageTitle from "@/src/features/dashboard/components/atoms/page-title";
import BackLink from "../components/atoms/back-link";
import ConfidentialTag from "../components/atoms/confidential-tag";
import RecipePanel, { PanelEmpty } from "../components/atoms/recipe-panel";
import IngredientList from "../components/molecules/ingredient-list";
import StepList from "../components/molecules/step-list";
import UsedByList from "../components/molecules/used-by-list";
import DeactivateRecipeModal from "../components/organisms/deactivate-recipe-modal";
import RecipeHistory from "../components/organisms/recipe-history";
import RecipeNotFound from "../components/organisms/recipe-not-found";
import { setMockRecipeActive, useMockRecipeHistory, useMockRecipes } from "../hooks/useMockRecipes";
import { formatRecipeDate } from "../utils/recipes";

type RecipeDetailProps = {
  id: string;
  /** Recipe managers and superadmins; everyone else never receives the notes. */
  canSeeNotes: boolean;
  /** The same roles may edit, deactivate and reactivate, and read the history. */
  canManage: boolean;
};

const ACTION = "h-10 px-4 font-semibold";
const ACTION_IDS = { edit: "recipe-edit", deactivate: "recipe-deactivate", reactivate: "recipe-reactivate" };

// A recipe as the kitchen reads it: what goes in beside how it's made, then
// the confidential notes, the menu items that depend on it and its history.
export default function RecipeDetail({ id, canSeeNotes, canManage }: RecipeDetailProps) {
  // Placeholder data until the recipe, ingredients and steps endpoints are wired
  // up. The API leaves the notes out for other roles; this mock only hides them.
  const recipe = useMockRecipes().find((r) => r.id === id) ?? null;
  const history = useMockRecipeHistory(id);
  const [confirming, setConfirming] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  // The button that was pressed disappears, so focus moves to the one that replaced it.
  const focusAfterRender = useRef<string | null>(null);
  useEffect(() => {
    if (!focusAfterRender.current) return;
    document.getElementById(focusAfterRender.current)?.focus();
    focusAfterRender.current = null;
  });

  if (!recipe) return <RecipeNotFound />;

  const deactivate = () => {
    // Placeholder until DELETE /recipes/:id is wired.
    setMockRecipeActive(recipe.id, false);
    setConfirming(false);
    setAnnouncement(`${recipe.name} deactivated.`);
  };

  const reactivate = () => {
    // Placeholder until PATCH /recipes/:id/reactivate is wired.
    setMockRecipeActive(recipe.id, true);
    setAnnouncement(`${recipe.name} reactivated.`);
    focusAfterRender.current = ACTION_IDS.edit;
  };

  return (
    <section className="motion-safe:animate-page-in">
      <BackLink />

      <header className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
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
        </div>

        {canManage ? (
          <div className="flex shrink-0 gap-2">
            {recipe.active ? (
              <>
                <Button
                  id={ACTION_IDS.deactivate}
                  variant="destructive"
                  size="lg"
                  className={ACTION}
                  aria-haspopup="dialog"
                  onClick={() => setConfirming(true)}
                >
                  <Ban aria-hidden="true" />
                  Deactivate
                </Button>
                <Link
                  id={ACTION_IDS.edit}
                  href={`/dashboard/recipes/${recipe.id}/edit`}
                  className={buttonVariants({ size: "lg", className: ACTION })}
                >
                  <Pencil aria-hidden="true" />
                  Edit
                </Link>
              </>
            ) : (
              <Button id={ACTION_IDS.reactivate} size="lg" className={ACTION} onClick={reactivate}>
                <RotateCcw aria-hidden="true" />
                Reactivate
              </Button>
            )}
          </div>
        ) : null}
      </header>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {recipe.active ? null : (
        <p className="mt-5 flex max-w-3xl items-start gap-2.5 rounded-lg bg-surface-hover px-3 py-2.5 text-sm leading-5 text-ink">
          <Archive aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-muted" strokeWidth={2.25} />
          <span>
            <span className="font-semibold">Inactive.</span>{" "}
            {canManage
              ? "Retired, so no menu item can be linked to it and it can't be edited. Reactivate it to make changes."
              : "Retired, so no menu item can be linked to it. It stays here for reference."}
          </span>
        </p>
      )}

      <DeactivateRecipeModal
        open={confirming}
        onOpenChange={setConfirming}
        recipeName={recipe.name}
        usedBy={recipe.usedBy}
        onConfirm={deactivate}
        // Kept: back to Deactivate. Deactivated: on to Reactivate, which replaced it.
        finalFocus={() =>
          document.getElementById(ACTION_IDS.deactivate) ?? document.getElementById(ACTION_IDS.reactivate)
        }
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        <div className="grid gap-4">
          <IngredientList ingredients={recipe.ingredients} />
          <UsedByList items={recipe.usedBy} menuHref={`/dashboard/menu?brand=${recipe.brand.code}`} />
          {/* Same roles as the history API; its snapshots carry the confidential notes. */}
          {canManage ? <RecipeHistory versions={history} /> : null}
        </div>
        <div className="grid gap-4">
          <StepList steps={recipe.steps} />
          {canSeeNotes ? (
            <RecipePanel id="recipe-notes-heading" title="Formulation notes" aside={<ConfidentialTag />}>
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
