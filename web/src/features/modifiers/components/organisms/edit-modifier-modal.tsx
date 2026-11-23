"use client";

import { X } from "lucide-react";
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
import {
  modifierSaveError,
  type ModifierSaveError,
} from "../../utils/modifier-errors";
import {
  FIELD_ORDER,
  hasErrors,
  hasFormChanges,
  toFormValues,
  toPayload,
  validateModifierForm,
  type ModifierFormErrors,
  type ModifierFormValues,
  type ModifierPayload,
} from "../../utils/modifier-form";
import { itemCount, type Modifier } from "../../utils/modifiers";
import ModifierFields from "../molecules/modifier-fields";

type EditModifierModalProps = {
  modifier: Modifier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Saves it; rejects with the API's reason, which the form shows. */
  onSubmit: (payload: ModifierPayload) => Promise<unknown>;
};

// DESIGN.md › Elevation: dialogs get Shadow 3. Shadows vanish on the dark
// surface, so dark mode swaps it for a hairline edge instead of stacking both.
const SURFACE =
  "shadow-[0_8px_24px_rgba(25,41,62,0.14),0_2px_8px_rgba(25,41,62,0.08)] dark:shadow-none dark:ring-1 dark:ring-hairline";

const ID = "edit-modifier";

export default function EditModifierModal({
  modifier,
  open,
  onOpenChange,
  ...formProps
}: EditModifierModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={`flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-xl bg-card p-0 text-ink ring-0 sm:max-w-lg ${SURFACE}`}
      >
        {/* The dialog unmounts its content when closed, so every open starts from the saved values. */}
        {modifier ? (
          <EditModifierForm modifier={modifier} {...formProps} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// A rename shows up on every item that offers it, so the description says how many.
function editScope(modifier: Modifier) {
  const used = modifier.useCount;
  if (used === 0)
    return `Update ${modifier.name}. It isn't on any menu item yet.`;
  return `Changes show on all ${itemCount(used)} that offer ${modifier.name}. Prices are set on each item.`;
}

function EditModifierForm({
  modifier,
  onSubmit,
}: Omit<EditModifierModalProps, "modifier" | "open" | "onOpenChange"> & {
  modifier: Modifier;
}) {
  const [values, setValues] = useState<ModifierFormValues>(() =>
    toFormValues(modifier),
  );
  // Errors show after the first save attempt, then follow every keystroke.
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  // What the API refused, until the field it's about changes.
  const [saveError, setSaveError] = useState<
    (ModifierSaveError & { code: string }) | null
  >(null);

  const errors: ModifierFormErrors = submitted
    ? validateModifierForm(values)
    : {};
  const serverError =
    saveError && (saveError.field !== "code" || saveError.code === values.code)
      ? saveError
      : null;
  if (serverError?.field === "code" && !errors.code)
    errors.code = serverError.message;
  const changed = hasFormChanges(modifier, values);
  const change = (key: keyof ModifierFormValues, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSubmitted(true);
    const found = validateModifierForm(values);
    if (hasErrors(found)) {
      const first = FIELD_ORDER.find((name) => name in found);
      document.getElementById(`${ID}-${first}`)?.focus();
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await onSubmit(toPayload(values));
    } catch (error) {
      const reason = modifierSaveError(error);
      setSaveError({ ...reason, code: values.code });
      if (reason.field)
        document.getElementById(`${ID}-${reason.field}`)?.focus();
      setSaving(false);
    }
  };

  return (
    <form noValidate className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
      <DialogHeader className="flex-row items-center justify-between gap-4 border-b border-hairline py-3 pr-3 pl-6">
        <DialogTitle className="text-base font-semibold text-ink">
          Edit modifier
        </DialogTitle>
        <DialogClose
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              className="size-10 text-ink-muted hover:text-ink"
            />
          }
        >
          <X aria-hidden="true" className="size-5" />
          <span className="sr-only">Close</span>
        </DialogClose>
      </DialogHeader>

      <div className="flex min-h-0 flex-col gap-5 overflow-y-auto overscroll-contain px-6 pt-5 pb-6">
        <DialogDescription className="text-sm leading-relaxed text-ink-muted">
          {editScope(modifier)}
        </DialogDescription>

        <ModifierFields
          idPrefix={ID}
          values={values}
          onChange={change}
          errors={errors}
          codeHint="Must be unique across every modifier."
        />
      </div>

      {serverError && !serverError.field ? (
        <p role="alert" className="px-6 pb-3 text-sm leading-5 text-danger-ink">
          {serverError.message}
        </p>
      ) : null}

      <DialogFooter className="mx-0 mb-0 items-center border-hairline bg-transparent px-6 py-4 sm:justify-between">
        <p
          className={cn(
            "hidden text-sm text-ink-muted sm:block",
            !changed && "invisible",
          )}
          aria-live="polite"
        >
          {changed ? "Unsaved changes" : "No changes yet"}
        </p>
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
          <DialogClose
            render={
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-10 px-4 font-semibold"
              />
            }
          >
            Cancel
          </DialogClose>
          <Button
            type="submit"
            size="lg"
            className="h-10 px-4 font-semibold"
            disabled={!changed || saving}
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
