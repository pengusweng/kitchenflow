"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/src/components/ui/atoms/input";
import Textarea from "@/src/components/ui/atoms/textarea";
import BrandSelect from "@/src/components/ui/molecules/brand-select";
import FormField, { fieldMessageId } from "@/src/features/brands/components/molecules/form-field";
import type { MenuBrand } from "@/src/features/menu/utils/menu";
import { MOCK_BRANDS } from "@/src/features/menu/utils/mock-menu";
import { useUnits } from "../../hooks/useUnits";
import {
  countProblems,
  firstProblemId,
  moveItem,
  newIngredientDraft,
  newStepDraft,
  RECIPE_LIMITS,
  recipeFieldId,
  suggestRecipeCode,
  validateRecipeForm,
  type IngredientDraft,
  type RecipeFormErrors,
  type RecipeFormValues,
} from "../../utils/recipe-form";
import { groupUnits, type Unit } from "../../utils/units";
import ConfidentialTag from "../atoms/confidential-tag";
import RecipePanel from "../atoms/recipe-panel";
import IngredientEditor from "../molecules/ingredient-editor";
import StepEditor from "../molecules/step-editor";
import AddUnitModal from "./add-unit-modal";

// DESIGN.md › Elevation: floating surfaces get Shadow 3; dark mode swaps it for a hairline edge.
const FLOATING =
  "shadow-[0_8px_24px_rgba(25,41,62,0.14),0_2px_8px_rgba(25,41,62,0.08)] dark:shadow-none dark:ring-1 dark:ring-hairline";

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

type RecipeFormProps = {
  /** Above the panels: back link, title and what saving does. */
  header: ReactNode;
  initialValues: RecipeFormValues;
  /** A new recipe's code follows its brand and name until someone types their own. */
  suggestCode: boolean;
  /** When editing: the API doesn't let a recipe move to another brand. */
  lockedBrand?: MenuBrand;
  /** Codes other recipes use, uppercased. */
  takenCodes: Set<string>;
  submitLabel: string;
  /** Finishes "Fix 2 problems to …", e.g. "add this recipe". */
  savePhrase: string;
  cancelHref: string;
  /**
   * Called with values that pass validation. Returns a message to show in the
   * action bar instead when there's nothing to save.
   */
  onSave: (values: RecipeFormValues) => string | undefined;
};

// Laid out like the recipe page: details on top, ingredients beside steps,
// the confidential notes last. Shared by the add and edit pages.
export default function RecipeForm({
  header,
  initialValues,
  suggestCode,
  lockedBrand,
  takenCodes,
  submitLabel,
  savePhrase,
  cancelHref,
  onSave,
}: RecipeFormProps) {
  const [values, setValues] = useState<RecipeFormValues>(initialValues);
  const [codeEdited, setCodeEdited] = useState(!suggestCode);
  // Errors show after the first save attempt, then follow every keystroke.
  const [submitted, setSubmitted] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  // A message from onSave, shown until the form changes.
  const [notice, setNotice] = useState<{ text: string; values: RecipeFormValues } | null>(null);

  // A row added or moved by a button gets focus once it has rendered.
  const focusAfterRender = useRef<string | null>(null);
  useEffect(() => {
    if (!focusAfterRender.current) return;
    document.getElementById(focusAfterRender.current)?.focus();
    focusAfterRender.current = null;
  });

  // Units come from the API (GET /units); one added here (POST /units) joins the list.
  const units = useUnits();
  const unitCodes = new Set(units.units.map((unit) => unit.code));
  const unitGroups = groupUnits(units.units);
  // The ingredient row whose unit picker opened the add-unit dialog.
  const [addingUnitFor, setAddingUnitFor] = useState<string | null>(null);
  const addingUnitRow = values.ingredients.find((row) => row.key === addingUnitFor);

  const errors: RecipeFormErrors = submitted ? validateRecipeForm(values, takenCodes, unitCodes) : {};
  const problems = countProblems(errors);

  const unitAdded = (unit: Unit) => {
    units.add(unit);
    if (addingUnitFor) changeIngredient(addingUnitFor, { unit: unit.code });
    setAddingUnitFor(null);
  };

  const setDetail = (key: "brand" | "name" | "code" | "notes", value: string) =>
    setValues((current) => {
      const next = { ...current, [key]: value };
      if ((key === "brand" || key === "name") && !codeEdited) next.code = suggestRecipeCode(next.brand, next.name);
      return next;
    });

  const changeCode = (value: string) => {
    // Clearing a suggested code hands it back to the suggestion on the next brand or name change.
    if (suggestCode) setCodeEdited(value !== "");
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
    const found = validateRecipeForm(values, takenCodes, unitCodes);
    if (countProblems(found) > 0) {
      const id = firstProblemId(values, found);
      if (id) document.getElementById(id)?.focus();
      return;
    }
    const message = onSave(values);
    setNotice(message ? { text: message, values } : null);
  };

  const filledIngredients = values.ingredients.filter((row) => row.name.trim()).length;
  const filledSteps = values.steps.filter((s) => s.instruction.trim()).length;
  const codeHint = codeEdited ? "Must be unique across all recipes." : "Suggested from the brand and name.";
  const showNotice = notice !== null && notice.values === values;

  return (
    <form noValidate onSubmit={submit} className="motion-safe:animate-page-in">
      {header}

      <div className="mt-6 grid gap-4">
        <RecipePanel id="recipe-form-details-heading" title="Details">
          <div className="grid gap-5 py-4 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,1fr)] md:gap-4">
            {lockedBrand ? (
              <FormField id={recipeFieldId.brand} label="Brand" hint="A recipe stays with its brand.">
                <Input
                  id={recipeFieldId.brand}
                  readOnly
                  value={lockedBrand.name}
                  aria-describedby={fieldMessageId(recipeFieldId.brand, true)}
                  className="h-10 bg-surface-hover text-ink-muted md:text-sm"
                />
              </FormField>
            ) : (
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
            )}
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
            id="recipe-form-ingredients-heading"
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
              unitGroups={unitGroups}
              onAddUnit={setAddingUnitFor}
            />
          </RecipePanel>

          <div className="grid gap-4">
            <RecipePanel
              id="recipe-form-steps-heading"
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

            <RecipePanel id="recipe-form-notes-heading" title="Formulation notes" aside={<ConfidentialTag />}>
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
              Fix {count(problems, "problem", "problems")} to {savePhrase}.
            </span>
          ) : showNotice ? (
            <span className="font-semibold text-ink">{notice.text}</span>
          ) : (
            <span className="text-ink-muted">Blank ingredient rows and steps are left out.</span>
          )}
        </p>
        <div className="ml-auto flex gap-2">
          <Link
            href={cancelHref}
            className={buttonVariants({ variant: "outline", size: "lg", className: "h-10 px-4 font-semibold" })}
          >
            Cancel
          </Link>
          <Button type="submit" size="lg" className="h-10 px-4 font-semibold">
            {submitLabel}
          </Button>
        </div>
      </div>

      <AddUnitModal
        open={addingUnitFor !== null}
        onOpenChange={(open) => {
          if (!open) setAddingUnitFor(null);
        }}
        onCreated={unitAdded}
        existingCodes={new Set(units.units.map((unit) => unit.code.toLowerCase()))}
        defaultDimension={units.units.find((unit) => unit.code === addingUnitRow?.unit)?.dimension}
      />
    </form>
  );
}
