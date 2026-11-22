"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/src/components/ui/atoms/input";
import Textarea from "@/src/components/ui/atoms/textarea";
import BrandSelect from "@/src/components/ui/molecules/brand-select";
import FormField, { fieldMessageId } from "@/src/features/brands/components/molecules/form-field";
import PageTitle from "@/src/features/dashboard/components/atoms/page-title";
import { MOCK_BRANDS } from "@/src/features/menu/utils/mock-menu";
import BackLink from "../components/atoms/back-link";
import ConfidentialTag from "../components/atoms/confidential-tag";
import RecipePanel from "../components/atoms/recipe-panel";
import IngredientEditor from "../components/molecules/ingredient-editor";
import StepEditor from "../components/molecules/step-editor";
import { addMockRecipe, useMockRecipes } from "../hooks/useMockRecipes";
import {
  countProblems,
  emptyRecipeForm,
  firstProblemId,
  moveItem,
  newIngredientDraft,
  newStepDraft,
  RECIPE_LIMITS,
  recipeFieldId,
  suggestRecipeCode,
  toCreateRecipePayload,
  toNewRecipeDetail,
  validateRecipeForm,
  type IngredientDraft,
  type RecipeFormErrors,
  type RecipeFormValues,
} from "../utils/recipe-form";

// DESIGN.md › Elevation: floating surfaces get Shadow 3; dark mode swaps it for a hairline edge.
const FLOATING =
  "shadow-[0_8px_24px_rgba(25,41,62,0.14),0_2px_8px_rgba(25,41,62,0.08)] dark:shadow-none dark:ring-1 dark:ring-hairline";

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// Laid out like the recipe page it creates: details on top, ingredients beside
// steps, the confidential notes last. Static for now: the recipe joins the
// page's own list and opens on its new page.
export default function NewRecipe() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recipes = useMockRecipes();

  const brandParam = searchParams.get("brand")?.toUpperCase() ?? "";
  const startBrand = MOCK_BRANDS.some((b) => b.code === brandParam) ? brandParam : "";

  const [values, setValues] = useState<RecipeFormValues>(() => emptyRecipeForm(startBrand));
  // The code follows the brand and name until someone types their own.
  const [codeEdited, setCodeEdited] = useState(false);
  // Errors show after the first add attempt, then follow every keystroke.
  const [submitted, setSubmitted] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  // A row added or moved by a button gets focus once it has rendered.
  const focusAfterRender = useRef<string | null>(null);
  useEffect(() => {
    if (!focusAfterRender.current) return;
    document.getElementById(focusAfterRender.current)?.focus();
    focusAfterRender.current = null;
  });

  const takenCodes = new Set(recipes.map((r) => r.code.toUpperCase()));
  const errors: RecipeFormErrors = submitted ? validateRecipeForm(values, takenCodes) : {};
  const problems = countProblems(errors);

  const setDetail = (key: "brand" | "name" | "code" | "notes", value: string) =>
    setValues((current) => {
      const next = { ...current, [key]: value };
      if ((key === "brand" || key === "name") && !codeEdited) next.code = suggestRecipeCode(next.brand, next.name);
      return next;
    });

  const changeCode = (value: string) => {
    // Clearing the code hands it back to the suggestion on the next brand or name change.
    setCodeEdited(value !== "");
    setValues((current) => ({ ...current, code: value }));
  };

  const changeIngredient = (key: string, patch: Partial<IngredientDraft>) =>
    setValues((current) => ({
      ...current,
      ingredients: current.ingredients.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    }));

  const addIngredient = () => {
    // A new row keeps the unit of the row above, since runs of grams or millilitres are common.
    const row = newIngredientDraft(values.ingredients.at(-1)?.unit);
    focusAfterRender.current = recipeFieldId.ingredient(row.key, "quantity");
    setValues((current) => ({ ...current, ingredients: [...current.ingredients, row] }));
  };

  const removeIngredient = (key: string) => {
    const index = values.ingredients.findIndex((row) => row.key === key);
    const rest = values.ingredients.filter((row) => row.key !== key);
    // Removing the only row leaves a blank one rather than an empty panel.
    const next = rest.length > 0 ? rest : [newIngredientDraft()];
    const neighbour = next[Math.min(index, next.length - 1)];
    focusAfterRender.current = recipeFieldId.ingredient(neighbour.key, "quantity");
    setValues((current) => ({ ...current, ingredients: next }));
  };

  const addStep = () => {
    const step = newStepDraft();
    focusAfterRender.current = recipeFieldId.step(step.key);
    setValues((current) => ({ ...current, steps: [...current.steps, step] }));
  };

  const removeStep = (key: string) => {
    const index = values.steps.findIndex((s) => s.key === key);
    const rest = values.steps.filter((s) => s.key !== key);
    const next = rest.length > 0 ? rest : [newStepDraft()];
    focusAfterRender.current = recipeFieldId.step(next[Math.min(index, next.length - 1)].key);
    setValues((current) => ({ ...current, steps: next }));
    setAnnouncement(`Step ${index + 1} removed.`);
  };

  const moveStep = (key: string, delta: -1 | 1) => {
    const index = values.steps.findIndex((s) => s.key === key);
    const target = index + delta;
    const next = moveItem(values.steps, index, delta);
    if (next === values.steps) return;
    // Keep focus on the arrow that was pressed, or its partner once the step reaches an end.
    const atEnd = target === 0 || target === next.length - 1;
    const direction = delta < 0 ? "up" : "down";
    const other = delta < 0 ? "down" : "up";
    focusAfterRender.current = `${key}-${atEnd ? other : direction}`;
    setValues((current) => ({ ...current, steps: next }));
    setAnnouncement(`Step ${index + 1} is now step ${target + 1}.`);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const found = validateRecipeForm(values, takenCodes);
    if (countProblems(found) > 0) {
      const id = firstProblemId(values, found);
      if (id) document.getElementById(id)?.focus();
      return;
    }
    const brand = MOCK_BRANDS.find((b) => b.code === values.brand);
    if (!brand) return;
    // Placeholder until POST /recipes is wired: the payload is exactly what it takes.
    const payload = toCreateRecipePayload(values, brand.id);
    const id = `rcp-new-${crypto.randomUUID().slice(0, 8)}`;
    addMockRecipe(toNewRecipeDetail(id, brand, payload, new Date()));
    router.push(`/dashboard/recipes/${id}`);
  };

  const filledIngredients = values.ingredients.filter((row) => row.name.trim()).length;
  const filledSteps = values.steps.filter((s) => s.instruction.trim()).length;
  const codeHint = codeEdited ? "Must be unique across all recipes." : "Suggested from the brand and name.";

  return (
    <form noValidate onSubmit={submit} className="motion-safe:animate-page-in">
      <BackLink />
      <header className="mt-2">
        <PageTitle>New recipe</PageTitle>
        <p className="mt-1 text-sm text-ink-muted">Starts active at version 1. Menu items can link to it once it&apos;s added.</p>
      </header>

      <div className="mt-6 grid gap-4">
        <RecipePanel id="new-recipe-details-heading" title="Details">
          <div className="grid gap-5 py-4 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,1fr)] md:gap-4">
            <FormField id={recipeFieldId.brand} label="Brand" error={errors.brand}>
              <BrandSelect
                id={recipeFieldId.brand}
                brands={MOCK_BRANDS}
                value={values.brand}
                onChange={(code) => setDetail("brand", code)}
                aria-invalid={Boolean(errors.brand)}
                aria-describedby={fieldMessageId(recipeFieldId.brand, Boolean(errors.brand))}
              />
            </FormField>
            <FormField id={recipeFieldId.name} label="Name" error={errors.name}>
              <Input
                id={recipeFieldId.name}
                autoComplete="off"
                maxLength={RECIPE_LIMITS.name}
                placeholder="e.g. Kimchi Fried Rice"
                value={values.name}
                onChange={(e) => setDetail("name", e.target.value)}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={fieldMessageId(recipeFieldId.name, Boolean(errors.name))}
              />
            </FormField>
            <FormField id={recipeFieldId.code} label="Code" hint={codeHint} error={errors.code}>
              <Input
                id={recipeFieldId.code}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={RECIPE_LIMITS.code}
                placeholder="RCP-"
                value={values.code}
                onChange={(e) => changeCode(e.target.value.toUpperCase())}
                aria-invalid={Boolean(errors.code)}
                aria-describedby={fieldMessageId(recipeFieldId.code, true)}
                className="font-mono text-sm tracking-[0.04em] uppercase md:text-sm"
              />
            </FormField>
          </div>
        </RecipePanel>

        <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
          <RecipePanel
            id="new-recipe-ingredients-heading"
            title="Ingredients"
            aside={filledIngredients > 0 ? count(filledIngredients, "item", "items") : null}
          >
            <IngredientEditor
              ingredients={values.ingredients}
              onChange={changeIngredient}
              onAdd={addIngredient}
              onRemove={removeIngredient}
              onFocusRequest={(id) => document.getElementById(id)?.focus()}
              errors={errors}
            />
          </RecipePanel>

          <div className="grid gap-4">
            <RecipePanel
              id="new-recipe-steps-heading"
              title="Steps"
              aside={filledSteps > 0 ? count(filledSteps, "step", "steps") : null}
            >
              <StepEditor
                steps={values.steps}
                onChange={(key, instruction) =>
                  setValues((current) => ({
                    ...current,
                    steps: current.steps.map((s) => (s.key === key ? { ...s, instruction } : s)),
                  }))
                }
                onAdd={addStep}
                onRemove={removeStep}
                onMove={moveStep}
                errors={errors}
                announcement={announcement}
              />
            </RecipePanel>

            <RecipePanel id="new-recipe-notes-heading" title="Formulation notes" aside={<ConfidentialTag />}>
              <div className="py-4">
                <FormField
                  id={recipeFieldId.notes}
                  label="Notes for recipe managers"
                  hint={`Optional. Yield, sourcing, what to watch for. ${values.notes.trim().length} of ${RECIPE_LIMITS.notes} characters.`}
                  error={errors.notes}
                >
                  <Textarea
                    id={recipeFieldId.notes}
                    rows={4}
                    maxLength={RECIPE_LIMITS.notes}
                    value={values.notes}
                    onChange={(e) => setDetail("notes", e.target.value)}
                    aria-invalid={Boolean(errors.notes)}
                    aria-describedby={fieldMessageId(recipeFieldId.notes, true)}
                  />
                </FormField>
              </div>
            </RecipePanel>
          </div>
        </div>
      </div>

      <div
        className={`sticky bottom-4 z-10 mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-xl bg-card px-4 py-3 md:px-5 ${FLOATING}`}
      >
        <p aria-live="polite" className="text-sm">
          {problems > 0 ? (
            <span className="font-semibold text-danger-ink dark:text-destructive">
              Fix {count(problems, "problem", "problems")} to add this recipe.
            </span>
          ) : (
            <span className="text-ink-muted">Blank ingredient rows and steps are left out.</span>
          )}
        </p>
        <div className="ml-auto flex gap-2">
          <Link
            href="/dashboard/recipes"
            className={buttonVariants({ variant: "outline", size: "lg", className: "h-10 px-4 font-semibold" })}
          >
            Cancel
          </Link>
          <Button type="submit" size="lg" className="h-10 px-4 font-semibold">
            Add recipe
          </Button>
        </div>
      </div>
    </form>
  );
}
