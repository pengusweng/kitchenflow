"use client";

import { CircleAlert, LoaderCircle, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/src/components/ui/atoms/input";
import FormField, { fieldMessageId } from "@/src/features/brands/components/molecules/form-field";
import { ApiError } from "@/src/lib/api-error";
import type { UnitDimension } from "../../schemas/unitSchema";
import { createUnit } from "../../services/units.service";
import {
  DIMENSIONS,
  emptyUnitForm,
  toCreateUnitPayload,
  toUnit,
  UNIT_LIMITS,
  validateUnitForm,
  type Unit,
  type UnitFormErrors,
  type UnitFormValues,
} from "../../utils/units";

type AddUnitModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (unit: Unit) => void;
  /** Codes already in the picker, so a duplicate is caught before the request. */
  existingCodes: Set<string>;
  /** What the new unit measures to begin with, e.g. the dimension of the row's current unit. */
  defaultDimension?: UnitDimension;
};

// DESIGN.md › Elevation: dialogs get Shadow 3. Shadows vanish on the dark
// surface, so dark mode swaps it for a hairline edge instead of stacking both.
const SURFACE =
  "shadow-[0_8px_24px_rgba(25,41,62,0.14),0_2px_8px_rgba(25,41,62,0.08)] dark:shadow-none dark:ring-1 dark:ring-hairline";

const ID = "add-unit";
const FIELD_ORDER = ["code", "name", "toBase"] as const;
const EXAMPLES: Record<UnitDimension, string> = {
  MASS: "1 kg is 1000 g.",
  VOLUME: "1 cup is 240 ml.",
  COUNT: "1 dozen is 12 pc.",
};

export default function AddUnitModal({ open, onOpenChange, ...formProps }: AddUnitModalProps) {
  const [submitting, setSubmitting] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // A request in flight finishes before the dialog can close.
        if (!next && submitting) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={`flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-xl bg-card p-0 text-ink ring-0 sm:max-w-md ${SURFACE}`}
      >
        {/* The dialog unmounts its content when closed, so every open starts blank. */}
        <AddUnitForm {...formProps} submitting={submitting} onSubmittingChange={setSubmitting} />
      </DialogContent>
    </Dialog>
  );
}

function AddUnitForm({
  onCreated,
  existingCodes,
  defaultDimension,
  submitting,
  onSubmittingChange,
}: Omit<AddUnitModalProps, "open" | "onOpenChange"> & {
  submitting: boolean;
  onSubmittingChange: (submitting: boolean) => void;
}) {
  const [values, setValues] = useState<UnitFormValues>(() => ({
    ...emptyUnitForm(),
    dimension: defaultDimension ?? emptyUnitForm().dimension,
  }));
  // Errors show after the first add attempt, then follow every keystroke.
  const [submitted, setSubmitted] = useState(false);
  // What the API said: a code that's taken, or a problem with the whole request.
  const [takenCode, setTakenCode] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const id = (field: keyof UnitFormValues) => `${ID}-${field}`;
  const check = (): UnitFormErrors => {
    const found = validateUnitForm(values, existingCodes);
    if (!found.code && takenCode !== null && values.code.trim() === takenCode) {
      found.code = "There's already a unit with this code.";
    }
    return found;
  };
  const errors = submitted ? check() : {};
  const base = DIMENSIONS[values.dimension];
  const code = values.code.trim();

  const set = <K extends keyof UnitFormValues>(key: K, value: UnitFormValues[K]) => {
    setServerError(null);
    setValues((current) => ({ ...current, [key]: value }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    // This dialog opens from inside the recipe form; React carries events up
    // through the portal, so keep this submit from also submitting the recipe.
    e.stopPropagation();
    if (submitting) return;
    setSubmitted(true);
    setServerError(null);

    const found = check();
    const first = FIELD_ORDER.find((field) => found[field]);
    if (first) {
      document.getElementById(id(first))?.focus();
      return;
    }

    onSubmittingChange(true);
    try {
      const unit = await createUnit(toCreateUnitPayload(values));
      onSubmittingChange(false);
      onCreated(toUnit(unit));
    } catch (error) {
      onSubmittingChange(false);
      if (error instanceof ApiError && error.status === 409) {
        setTakenCode(code);
        document.getElementById(id("code"))?.focus();
      } else if (error instanceof ApiError && error.status === 401) {
        setServerError("Your session has expired. Sign in again, then add the unit.");
      } else if (error instanceof ApiError && error.status === 403) {
        setServerError("Only recipe managers and superadmins can add units.");
      } else {
        setServerError(error instanceof Error ? error.message : "Unable to add the unit. Please try again.");
      }
    }
  };

  return (
    <form noValidate className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
      <DialogHeader className="flex-row items-center justify-between gap-4 border-b border-hairline py-3 pr-3 pl-6">
        <DialogTitle className="text-base font-semibold text-ink">Add unit</DialogTitle>
        <DialogClose
          disabled={submitting}
          render={<Button type="button" variant="ghost" size="icon-lg" className="size-10 text-ink-muted hover:text-ink" />}
        >
          <X aria-hidden="true" className="size-5" />
          <span className="sr-only">Close</span>
        </DialogClose>
      </DialogHeader>

      <div className="flex min-h-0 flex-col gap-5 overflow-y-auto overscroll-contain px-6 pt-5 pb-6">
        <DialogDescription className="text-sm leading-relaxed text-ink-muted">
          Every recipe can use it once it&apos;s added. Codes can&apos;t be changed later.
        </DialogDescription>

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm leading-5 font-semibold text-ink">Measures</legend>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-surface-hover p-1">
            {(Object.keys(DIMENSIONS) as UnitDimension[]).map((dimension) => (
              <label
                key={dimension}
                className={cn(
                  "flex h-9 cursor-pointer items-center justify-center rounded-md text-sm font-semibold text-ink-muted transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40 hover:text-ink",
                  values.dimension === dimension &&
                    "bg-card text-ink shadow-[0_1px_2px_rgba(25,41,62,0.12)] dark:shadow-none dark:ring-1 dark:ring-hairline",
                )}
              >
                <input
                  type="radio"
                  name={`${ID}-dimension`}
                  value={dimension}
                  checked={values.dimension === dimension}
                  onChange={() => set("dimension", dimension)}
                  className="sr-only"
                />
                {DIMENSIONS[dimension].label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
          <FormField id={id("code")} label="Code" error={errors.code}>
            <Input
              id={id("code")}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={UNIT_LIMITS.code}
              placeholder="cup"
              value={values.code}
              onChange={(e) => set("code", e.target.value)}
              aria-invalid={Boolean(errors.code)}
              aria-describedby={fieldMessageId(id("code"), Boolean(errors.code))}
              className="font-mono text-sm md:text-sm"
            />
          </FormField>
          <FormField id={id("name")} label="Name" error={errors.name}>
            <Input
              id={id("name")}
              autoComplete="off"
              maxLength={UNIT_LIMITS.name}
              placeholder="Cup"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={fieldMessageId(id("name"), Boolean(errors.name))}
            />
          </FormField>
        </div>

        <FormField
          id={id("toBase")}
          label={`How much is 1 ${code || "of this unit"}?`}
          hint={`In ${base.baseName}, so recipes can convert between units. For example, ${EXAMPLES[values.dimension]}`}
          error={errors.toBase}
        >
          <div className="relative">
            <Input
              id={id("toBase")}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={values.toBase}
              onChange={(e) => set("toBase", e.target.value)}
              aria-invalid={Boolean(errors.toBase)}
              aria-describedby={fieldMessageId(id("toBase"), true)}
              className="pr-12 text-right font-semibold"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-ink-muted"
            >
              {base.base}
            </span>
          </div>
        </FormField>

        {serverError ? (
          <p
            role="alert"
            className="flex items-start gap-2.5 rounded-lg bg-destructive/8 px-3 py-2.5 text-sm leading-5 text-danger-ink dark:text-destructive"
          >
            <CircleAlert aria-hidden="true" className="mt-px size-4 shrink-0 text-destructive" />
            {serverError}
          </p>
        ) : null}
      </div>

      <DialogFooter className="mx-0 mb-0 border-hairline bg-transparent px-6 py-4">
        <DialogClose
          disabled={submitting}
          render={<Button type="button" variant="outline" size="lg" className="h-10 px-4 font-semibold" />}
        >
          Cancel
        </DialogClose>
        <Button type="submit" size="lg" className="h-10 px-4 font-semibold" disabled={submitting} aria-busy={submitting}>
          {submitting ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
          {submitting ? "Adding…" : "Add unit"}
        </Button>
      </DialogFooter>
    </form>
  );
}
