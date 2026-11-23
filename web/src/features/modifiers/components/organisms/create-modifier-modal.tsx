"use client";

import { X } from "lucide-react";
import { useState, type FormEvent } from "react";
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
import { suggestCode } from "@/src/features/menu/utils/menu-form";
import {
  emptyFormValues,
  FIELD_ORDER,
  hasErrors,
  newModifier,
  validateModifierForm,
  type ModifierFormErrors,
  type ModifierFormValues,
} from "../../utils/modifier-form";
import type { Modifier } from "../../utils/modifiers";
import ModifierFields from "../molecules/modifier-fields";

type CreateModifierModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (modifier: Modifier) => void;
  /** Codes modifiers already use. */
  takenCodes: Set<string>;
};

// DESIGN.md › Elevation: dialogs get Shadow 3. Shadows vanish on the dark
// surface, so dark mode swaps it for a hairline edge instead of stacking both.
const SURFACE =
  "shadow-[0_8px_24px_rgba(25,41,62,0.14),0_2px_8px_rgba(25,41,62,0.08)] dark:shadow-none dark:ring-1 dark:ring-hairline";

const ID = "create-modifier";

export default function CreateModifierModal({ open, onOpenChange, ...formProps }: CreateModifierModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={`flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-xl bg-card p-0 text-ink ring-0 sm:max-w-lg ${SURFACE}`}
      >
        {/* The dialog unmounts its content when closed, so every open starts blank. */}
        <CreateModifierForm {...formProps} />
      </DialogContent>
    </Dialog>
  );
}

function CreateModifierForm({ onCreated, takenCodes }: Omit<CreateModifierModalProps, "open" | "onOpenChange">) {
  const [values, setValues] = useState<ModifierFormValues>(emptyFormValues);
  // The code follows the name until someone types their own.
  const [codeEdited, setCodeEdited] = useState(false);
  // Errors show after the first add attempt, then follow every keystroke.
  const [submitted, setSubmitted] = useState(false);

  const errors: ModifierFormErrors = submitted ? validateModifierForm(values, takenCodes) : {};

  const change = (key: keyof ModifierFormValues, value: string) => {
    // Clearing the code hands it back to the suggestion.
    const edited = key === "code" ? value !== "" : codeEdited;
    if (key === "code") setCodeEdited(edited);
    setValues((current) => {
      const next = { ...current, [key]: value };
      // Modifiers are shared by every brand, so the code has no brand prefix.
      if (!edited) next.code = suggestCode(undefined, next.name);
      return next;
    });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const found = validateModifierForm(values, takenCodes);
    if (hasErrors(found)) {
      const first = FIELD_ORDER.find((name) => name in found);
      document.getElementById(`${ID}-${first}`)?.focus();
      return;
    }
    const now = new Date().toISOString();
    onCreated(newModifier(`new-${crypto.randomUUID()}`, values, now));
  };

  return (
    <form noValidate className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
      <DialogHeader className="flex-row items-center justify-between gap-4 border-b border-hairline py-3 pr-3 pl-6">
        <DialogTitle className="text-base font-semibold text-ink">Add modifier</DialogTitle>
        <DialogClose
          render={<Button type="button" variant="ghost" size="icon-lg" className="size-10 text-ink-muted hover:text-ink" />}
        >
          <X aria-hidden="true" className="size-5" />
          <span className="sr-only">Close</span>
        </DialogClose>
      </DialogHeader>

      <div className="flex min-h-0 flex-col gap-5 overflow-y-auto overscroll-contain px-6 pt-5 pb-6">
        <DialogDescription className="text-sm leading-relaxed text-ink-muted">
          New modifiers start active and on no items. Add them to items from Menu &amp; availability, where each item
          sets its own price.
        </DialogDescription>

        <ModifierFields
          idPrefix={ID}
          values={values}
          onChange={change}
          errors={errors}
          codeHint={codeEdited ? "Must be unique across every modifier." : "Filled in from the name."}
        />
      </div>

      <DialogFooter className="mx-0 mb-0 items-center border-hairline bg-transparent px-6 py-4">
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
          <DialogClose render={<Button type="button" variant="outline" size="lg" className="h-10 px-4 font-semibold" />}>
            Cancel
          </DialogClose>
          <Button type="submit" size="lg" className="h-10 px-4 font-semibold">
            Add modifier
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
