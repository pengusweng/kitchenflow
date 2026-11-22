"use client";

import { Plus, X } from "lucide-react";
import type { KeyboardEvent } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/src/components/ui/atoms/input";
import SelectField from "@/src/components/ui/atoms/select-field";
import {
  RECIPE_LIMITS,
  recipeFieldId,
  UNIT_GROUPS,
  type IngredientDraft,
  type RecipeFormErrors,
} from "../../utils/recipe-form";

type IngredientEditorProps = {
  ingredients: IngredientDraft[];
  onChange: (key: string, patch: Partial<IngredientDraft>) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
  /** Moves focus to an element by id once it has rendered. */
  onFocusRequest: (id: string) => void;
  errors: RecipeFormErrors;
};

const FIELD = "h-10 md:text-sm";
const LIST_MESSAGE_ID = "recipe-ingredients-message";

// Rows in the order the recipe page shows them: amount, unit, then what it is.
// The amount sits right-aligned on the same edge as on the recipe page.
export default function IngredientEditor({
  ingredients,
  onChange,
  onAdd,
  onRemove,
  onFocusRequest,
  errors,
}: IngredientEditorProps) {
  // Enter moves down the list instead of submitting the form; on the last row it starts a new one.
  const nextRowOnEnter = (index: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    e.preventDefault();
    const next = ingredients[index + 1];
    if (next) onFocusRequest(recipeFieldId.ingredient(next.key, "quantity"));
    else onAdd();
  };

  return (
    <div>
      {/* Column labels for sighted users; each control carries its own accessible name. */}
      <div
        aria-hidden="true"
        className="hidden grid-cols-[5.5rem_5.5rem_minmax(0,1fr)_2.5rem] gap-x-2 pt-3 text-xs font-semibold text-ink-muted sm:grid"
      >
        <span className="pr-3 text-right">Amount</span>
        <span className="pl-3">Unit</span>
        <span className="pl-3">Ingredient</span>
      </div>

      <ol>
        {ingredients.map((row, index) => {
          const n = index + 1;
          const problems = errors.ingredient?.[row.key] ?? {};
          const messages = [problems.quantity, problems.unit, problems.name].filter(Boolean);
          const ownMessage = messages.length > 0 ? `${row.key}-message` : undefined;
          // "Add at least one ingredient" belongs to the first row, where focus lands.
          const messageId = ownMessage ?? (index === 0 && errors.ingredients ? LIST_MESSAGE_ID : undefined);
          const label = row.name.trim() || `ingredient ${n}`;
          return (
            <li
              key={row.key}
              className="grid grid-cols-[5.5rem_minmax(0,1fr)_2.5rem] gap-x-2 gap-y-2 border-t border-hairline py-3 [grid-template-areas:'qty_unit_remove''name_name_name''note_note_note'] first:border-t-0 sm:grid-cols-[5.5rem_5.5rem_minmax(0,1fr)_2.5rem] sm:[grid-template-areas:'qty_unit_name_remove''._._note_.']"
            >
              <Input
                id={recipeFieldId.ingredient(row.key, "quantity")}
                aria-label={`Ingredient ${n} amount`}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                value={row.quantity}
                onChange={(e) => onChange(row.key, { quantity: e.target.value })}
                onKeyDown={nextRowOnEnter(index)}
                aria-invalid={Boolean(problems.quantity)}
                aria-describedby={messageId}
                className={cn(FIELD, "text-right font-semibold [grid-area:qty]")}
              />
              <SelectField
                id={recipeFieldId.ingredient(row.key, "unit")}
                aria-label={`Ingredient ${n} unit`}
                value={row.unit}
                onChange={(e) => onChange(row.key, { unit: e.target.value })}
                aria-invalid={Boolean(problems.unit)}
                aria-describedby={messageId}
                wrapperClassName="[grid-area:unit]"
                className={FIELD}
              >
                {UNIT_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.units.map((unit) => (
                      // The code alone, as the recipe page writes amounts ("250 g"); the group says what it measures.
                      <option key={unit.code} value={unit.code} title={unit.name}>
                        {unit.code}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </SelectField>
              <Input
                id={recipeFieldId.ingredient(row.key, "name")}
                aria-label={`Ingredient ${n} name`}
                autoComplete="off"
                placeholder="e.g. Cooked rice"
                maxLength={RECIPE_LIMITS.ingredientName}
                value={row.name}
                onChange={(e) => onChange(row.key, { name: e.target.value })}
                onKeyDown={nextRowOnEnter(index)}
                aria-invalid={Boolean(problems.name)}
                aria-describedby={messageId}
                className={cn(FIELD, "[grid-area:name]")}
              />
              <Input
                id={recipeFieldId.ingredient(row.key, "note")}
                aria-label={`Ingredient ${n} note, optional`}
                autoComplete="off"
                placeholder="Note, e.g. Chopped (optional)"
                value={row.note}
                onChange={(e) => onChange(row.key, { note: e.target.value })}
                onKeyDown={nextRowOnEnter(index)}
                className="h-9 text-[0.8125rem] [grid-area:note] md:text-[0.8125rem]"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                onClick={() => onRemove(row.key)}
                className="size-10 text-ink-muted [grid-area:remove] hover:text-ink"
              >
                <X aria-hidden="true" className="size-4" />
                <span className="sr-only">Remove {label}</span>
              </Button>
              {ownMessage ? (
                <p
                  id={ownMessage}
                  role="alert"
                  className="col-span-full text-sm leading-5 text-danger-ink sm:col-start-1 dark:text-destructive"
                >
                  {messages.join(" ")}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>

      {errors.ingredients ? (
        <p id={LIST_MESSAGE_ID} role="alert" className="pb-1 text-sm text-danger-ink dark:text-destructive">
          {errors.ingredients}
        </p>
      ) : null}

      <div className="border-t border-hairline py-2">
        <Button type="button" variant="ghost" onClick={onAdd} className="h-9 -ml-2 px-2 font-semibold text-primary-ink">
          <Plus aria-hidden="true" />
          Add ingredient
        </Button>
      </div>
    </div>
  );
}
