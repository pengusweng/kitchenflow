"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import Textarea from "@/src/components/ui/atoms/textarea";
import { RECIPE_LIMITS, recipeFieldId, type RecipeFormErrors, type StepDraft } from "../../utils/recipe-form";

type StepEditorProps = {
  steps: StepDraft[];
  onChange: (key: string, instruction: string) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
  onMove: (key: string, delta: -1 | 1) => void;
  errors: RecipeFormErrors;
  /** Polite announcement after a move, e.g. "Step 3 is now step 2." */
  announcement: string;
};

function StepAction({
  id,
  label,
  disabled,
  onClick,
  children,
}: {
  id?: string;
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      id={id}
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      onClick={onClick}
      className="size-8 text-ink-muted hover:text-ink"
    >
      {children}
      <span className="sr-only">{label}</span>
    </Button>
  );
}

// The same numbered gutter as the recipe page; the numbers follow the order
// on screen, which is the order the API stores them in.
export default function StepEditor({ steps, onChange, onAdd, onRemove, onMove, errors, announcement }: StepEditorProps) {
  return (
    <div>
      <ol className="pt-1.5">
        {steps.map((step, index) => {
          const n = index + 1;
          const error = errors.step?.[step.key];
          const id = recipeFieldId.step(step.key);
          return (
            <li key={step.key} className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] gap-x-3 py-2.5">
              <span
                aria-hidden="true"
                className="mt-2 inline-flex size-6 items-center justify-center rounded-full bg-surface-hover text-xs font-semibold text-ink tabular-nums"
              >
                {n}
              </span>
              <div className="grid gap-1.5">
                <Textarea
                  id={id}
                  aria-label={`Step ${n}`}
                  rows={2}
                  maxLength={RECIPE_LIMITS.instruction}
                  placeholder={index === 0 ? "e.g. Stir-fry the kimchi over high heat for 2 minutes." : undefined}
                  value={step.instruction}
                  onChange={(e) => onChange(step.key, e.target.value)}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `${id}-message` : undefined}
                  className="min-h-18"
                />
                {error ? (
                  <p id={`${id}-message`} role="alert" className="text-sm leading-5 text-danger-ink dark:text-destructive">
                    {error}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col">
                <StepAction
                  id={`${step.key}-up`}
                  label={`Move step ${n} up`}
                  disabled={index === 0}
                  onClick={() => onMove(step.key, -1)}
                >
                  <ArrowUp aria-hidden="true" className="size-4" />
                </StepAction>
                <StepAction
                  id={`${step.key}-down`}
                  label={`Move step ${n} down`}
                  disabled={index === steps.length - 1}
                  onClick={() => onMove(step.key, 1)}
                >
                  <ArrowDown aria-hidden="true" className="size-4" />
                </StepAction>
                <StepAction label={`Remove step ${n}`} onClick={() => onRemove(step.key)}>
                  <X aria-hidden="true" className="size-4" />
                </StepAction>
              </div>
            </li>
          );
        })}
      </ol>

      {errors.steps ? (
        <p role="alert" className="pb-1 text-sm text-danger-ink dark:text-destructive">
          {errors.steps}
        </p>
      ) : null}

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div className="border-t border-hairline py-2">
        <Button type="button" variant="ghost" onClick={onAdd} className="h-9 -ml-2 px-2 font-semibold text-primary-ink">
          <Plus aria-hidden="true" />
          Add step
        </Button>
      </div>
    </div>
  );
}
