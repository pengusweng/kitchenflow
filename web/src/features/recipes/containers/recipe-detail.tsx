"use client";

import { Archive, Ban, CircleAlert, LoaderCircle, Pencil, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import BrandLabel from "@/src/components/ui/atoms/brand-label";
import StatusBadge from "@/src/features/brands/components/atoms/status-badge";
import PageTitle from "@/src/features/dashboard/components/atoms/page-title";
import BackLink from "../components/atoms/back-link";
import ConfidentialTag from "../components/atoms/confidential-tag";
import RecipePanel, { PanelEmpty, type PanelNotice } from "../components/atoms/recipe-panel";
import IngredientList from "../components/molecules/ingredient-list";
import StepList from "../components/molecules/step-list";
import UsedByList from "../components/molecules/used-by-list";
import DeactivateRecipeModal from "../components/organisms/deactivate-recipe-modal";
import RecipeHistory from "../components/organisms/recipe-history";
import RecipeNotFound from "../components/organisms/recipe-not-found";
import { useRecipe } from "../hooks/useRecipe";
import { useRecipeBrands } from "../hooks/useRecipeBrands";
import { useSetRecipeActive } from "../hooks/useRecipeMutations";
import { isNotFound, recipeStatusError } from "../utils/recipe-errors";
import { formatRecipeDate } from "../utils/recipes";

type RecipeDetailProps = {
  id: string;
  /** Recipe managers and superadmins; everyone else never receives the notes. */
  canSeeNotes: boolean;
  /** The same roles may edit, deactivate and reactivate, and read the steps and history. */
  canManage: boolean;
};

const ACTION = "h-10 px-4 font-semibold";
const ACTION_IDS = { edit: "recipe-edit", deactivate: "recipe-deactivate", reactivate: "recipe-reactivate" };

const loading = (text: string): PanelNotice => ({ text, kind: "loading" });
const failed = (error: Error): PanelNotice => ({ text: error.message, kind: "error" });

// A recipe as the kitchen reads it: what goes in beside how it's made, then
// the confidential notes, the menu items that depend on it and its history.
export default function RecipeDetail({ id, canSeeNotes, canManage }: RecipeDetailProps) {
  const { recipe, ingredients, steps, history, usedBy } = useRecipe(id, { canManage });
  const brands = useRecipeBrands();
  const setActive = useSetRecipeActive(id);
  const [confirming, setConfirming] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  // The button that was pressed disappears, so focus moves to the one that replaced it.
  const focusAfterRender = useRef<string | null>(null);
  useEffect(() => {
    if (!focusAfterRender.current) return;
    document.getElementById(focusAfterRender.current)?.focus();
    focusAfterRender.current = null;
  });

  if (recipe.isPending) {
    return (
      <section className="motion-safe:animate-page-in">
        <BackLink />
        <p role="status" className="mt-4 text-sm text-ink-muted">
          Loading recipe…
        </p>
      </section>
    );
  }
  if (recipe.error) {
    if (isNotFound(recipe.error)) return <RecipeNotFound />;
    return (
      <section className="motion-safe:animate-page-in">
        <BackLink />
        <div role="alert" className="mt-3 rounded-xl border border-hairline bg-card px-5 py-8 text-center">
          <PageTitle>Unable to load this recipe</PageTitle>
          <p className="mt-2 text-sm text-ink-muted">{recipe.error.message}</p>
          <Button variant="outline" size="lg" className={`mt-4 ${ACTION}`} onClick={() => recipe.refetch()}>
            Try again
          </Button>
        </div>
      </section>
    );
  }

  const record = recipe.data;
  const active = record.is_active;
  const brand = brands.isPending ? null : brands.brandFor(record.brand_id);
  const versions = history.data ?? [];
  // The API won't list an inactive recipe's ingredients or steps; its latest saved version has them.
  const latest = versions.at(-1);

  let ingredientNotice: PanelNotice | undefined;
  let stepNotice: PanelNotice | undefined;
  if (active) {
    if (ingredients.isPending) ingredientNotice = loading("Loading ingredients…");
    else if (ingredients.error) ingredientNotice = failed(ingredients.error);
    if (!canManage) stepNotice = { text: "Only recipe managers and superadmins can see the steps.", kind: "info" };
    else if (steps.isPending) stepNotice = loading("Loading steps…");
    else if (steps.error) stepNotice = failed(steps.error);
  } else if (!canManage) {
    const retired: PanelNotice = {
      text: "A retired recipe's contents are kept in its history, which recipe managers can open.",
      kind: "info",
    };
    ingredientNotice = retired;
    stepNotice = retired;
  } else if (history.isPending) {
    ingredientNotice = loading("Loading ingredients…");
    stepNotice = loading("Loading steps…");
  } else if (history.error) {
    ingredientNotice = failed(history.error);
    stepNotice = failed(history.error);
  }
  const shownIngredients = (active ? ingredients.data : latest?.ingredients) ?? [];
  const shownSteps = (active ? steps.data : latest?.steps) ?? [];

  let usedByNotice: PanelNotice | undefined;
  if (usedBy.isPending) usedByNotice = loading("Loading menu items…");
  else if (usedBy.error) usedByNotice = failed(usedBy.error);
  const usedByItems = usedBy.data?.items ?? [];

  let historyNotice: PanelNotice | undefined;
  if (history.isPending) historyNotice = loading("Loading history…");
  else if (history.error) historyNotice = failed(history.error);

  const deactivate = () => {
    setActive.mutate(false, {
      onSuccess: () => {
        setConfirming(false);
        setAnnouncement(`${record.name} deactivated.`);
      },
    });
  };

  const reactivate = () => {
    setActive.mutate(true, {
      onSuccess: () => {
        setAnnouncement(`${record.name} reactivated.`);
        focusAfterRender.current = ACTION_IDS.edit;
      },
    });
  };

  // A failed reactivate shows by the header; a failed deactivate shows in its dialog.
  const reactivateError = setActive.error && setActive.variables === true ? recipeStatusError(setActive.error, "reactivate") : null;
  const deactivateError =
    setActive.error && setActive.variables === false ? recipeStatusError(setActive.error, "deactivate") : null;
  const reactivating = setActive.isPending && setActive.variables === true;

  return (
    <section className="motion-safe:animate-page-in">
      <BackLink />

      <header className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <PageTitle>{record.name}</PageTitle>
          <p className="mt-1 font-mono text-sm break-words text-ink-muted select-all">{record.code}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink">
            {brand ? <BrandLabel brand={brand} /> : null}
            <span className="text-ink-muted">
              Version <span className="font-semibold text-ink tabular-nums">{record.version}</span>
            </span>
            <span className="text-ink-muted">
              Updated{" "}
              <time dateTime={record.modified_at} className="text-ink">
                {formatRecipeDate(record.modified_at)}
              </time>
            </span>
            <StatusBadge status={active ? "active" : "inactive"} />
          </div>
        </div>

        {canManage ? (
          <div className="flex shrink-0 gap-2">
            {active ? (
              <>
                <Button
                  id={ACTION_IDS.deactivate}
                  variant="destructive"
                  size="lg"
                  className={ACTION}
                  aria-haspopup="dialog"
                  onClick={() => {
                    setActive.reset();
                    setConfirming(true);
                  }}
                >
                  <Ban aria-hidden="true" />
                  Deactivate
                </Button>
                <Link
                  id={ACTION_IDS.edit}
                  href={`/dashboard/recipes/${record.recipe_id}/edit`}
                  className={buttonVariants({ size: "lg", className: ACTION })}
                >
                  <Pencil aria-hidden="true" />
                  Edit
                </Link>
              </>
            ) : (
              <Button
                id={ACTION_IDS.reactivate}
                size="lg"
                className={ACTION}
                onClick={reactivate}
                disabled={reactivating}
                aria-busy={reactivating}
              >
                {reactivating ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                ) : (
                  <RotateCcw aria-hidden="true" />
                )}
                {reactivating ? "Reactivating…" : "Reactivate"}
              </Button>
            )}
          </div>
        ) : null}
      </header>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {reactivateError ? (
        <p
          role="alert"
          className="mt-5 flex max-w-3xl items-start gap-2 text-sm leading-5 text-danger-ink dark:text-destructive"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {reactivateError}
        </p>
      ) : null}

      {active ? null : (
        <p className="mt-5 flex max-w-3xl items-start gap-2.5 rounded-lg bg-surface-hover px-3 py-2.5 text-sm leading-5 text-ink">
          <Archive aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-muted" strokeWidth={2.25} />
          <span>
            <span className="font-semibold">Inactive.</span>{" "}
            {canManage
              ? "Retired, so no menu item can be linked to it and it can't be edited. Reactivate it to make changes. Its ingredients and steps are from its latest version."
              : "Retired, so no menu item can be linked to it. It stays here for reference."}
          </span>
        </p>
      )}

      <DeactivateRecipeModal
        open={confirming}
        onOpenChange={setConfirming}
        recipeName={record.name}
        usedBy={usedByItems}
        onConfirm={deactivate}
        pending={setActive.isPending}
        error={deactivateError}
        // Kept: back to Deactivate. Deactivated: on to Reactivate, which replaced it.
        finalFocus={() =>
          document.getElementById(ACTION_IDS.deactivate) ?? document.getElementById(ACTION_IDS.reactivate)
        }
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        <div className="grid gap-4">
          <IngredientList ingredients={shownIngredients} notice={ingredientNotice} />
          <UsedByList
            items={usedByItems}
            total={usedBy.data?.total}
            notice={usedByNotice}
            menuHref={brand?.code ? `/dashboard/menu?brand=${brand.code}` : "/dashboard/menu"}
          />
          {/* Same roles as the history API; its snapshots carry the confidential notes. */}
          {canManage ? <RecipeHistory versions={versions} notice={historyNotice} /> : null}
        </div>
        <div className="grid gap-4">
          <StepList steps={shownSteps} notice={stepNotice} />
          {canSeeNotes ? (
            <RecipePanel id="recipe-notes-heading" title="Formulation notes" aside={<ConfidentialTag />}>
              {record.formulation_notes ? (
                <p className="max-w-[65ch] py-4 text-sm leading-6 whitespace-pre-line text-ink">
                  {record.formulation_notes}
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
