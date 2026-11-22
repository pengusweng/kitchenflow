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
import { type LogoPreview } from "@/src/features/brands/components/molecules/logo-field";
import { useLogoPicker } from "@/src/features/brands/hooks/useLogoPicker";
import type { MenuItem, MenuModifierOption } from "../../utils/menu";
import {
  applyMenuItemEdit,
  hasErrors,
  hasFormChanges,
  toFormValues,
  validateMenuItemForm,
  type MenuItemFormErrors,
  type MenuItemFormValues,
} from "../../utils/menu-form";
import { modifierPriceId } from "../molecules/modifier-editor";
import MenuItemFields, { FIELD_ORDER } from "./menu-item-fields";

type EditMenuItemModalProps = {
  item: MenuItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (item: MenuItem) => void;
  /** Recipes the item's brand can link to. */
  recipes: string[];
  modifierCatalog: MenuModifierOption[];
  /** Codes other menu items already use. */
  takenCodes: Set<string>;
};

// DESIGN.md › Elevation: dialogs get Shadow 3. Shadows vanish on the dark
// surface, so dark mode swaps it for a hairline edge instead of stacking both.
const SURFACE =
  "shadow-[0_8px_24px_rgba(25,41,62,0.14),0_2px_8px_rgba(25,41,62,0.08)] dark:shadow-none dark:ring-1 dark:ring-hairline";

export default function EditMenuItemModal({ item, open, onOpenChange, ...formProps }: EditMenuItemModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={`flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-xl bg-card p-0 text-ink ring-0 sm:max-w-xl ${SURFACE}`}
      >
        {/* The dialog unmounts its content when closed, so every open starts from the saved values. */}
        {item ? <EditMenuItemForm item={item} {...formProps} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function EditMenuItemForm({
  item,
  onSaved,
  recipes,
  modifierCatalog,
  takenCodes,
}: Omit<EditMenuItemModalProps, "item" | "open" | "onOpenChange"> & { item: MenuItem }) {
  const [values, setValues] = useState<MenuItemFormValues>(() => toFormValues(item));
  // Errors show after the first save attempt, then follow every keystroke.
  const [submitted, setSubmitted] = useState(false);
  const photo = useLogoPicker("Photos");

  const errors: MenuItemFormErrors = submitted ? validateMenuItemForm(values, takenCodes) : {};
  const changed = hasFormChanges(item, values, photo.logo !== null);
  const set = <K extends keyof MenuItemFormValues>(key: K, value: MenuItemFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  let preview: LogoPreview | null = null;
  if (photo.logo) preview = { url: photo.logo.previewUrl, name: photo.logo.file.name, size: photo.logo.file.size };
  else if (item.imageUrl) preview = { url: item.imageUrl, name: "Current photo" };

  // Keep the recipe on the list even if the brand's list no longer has it.
  const recipeOptions = recipes.includes(item.recipe) ? recipes : [item.recipe, ...recipes];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const found = validateMenuItemForm(values, takenCodes);
    if (hasErrors(found)) {
      const first = FIELD_ORDER.find((name) => name in found);
      const firstModifier = Object.keys(found.modifiers ?? {})[0];
      document.getElementById(first ? `edit-menu-item-${first}` : modifierPriceId(firstModifier))?.focus();
      return;
    }
    // Static UI: a fresh object URL for the picked photo, since the picker
    // releases its own as soon as this form closes.
    const imageUrl = photo.logo ? URL.createObjectURL(photo.logo.file) : item.imageUrl;
    onSaved(applyMenuItemEdit(item, values, imageUrl));
  };

  return (
    <form noValidate className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
      <DialogHeader className="flex-row items-center justify-between gap-4 border-b border-hairline py-3 pr-3 pl-6">
        <DialogTitle className="text-base font-semibold text-ink">Edit menu item</DialogTitle>
        <DialogClose
          render={<Button type="button" variant="ghost" size="icon-lg" className="size-10 text-ink-muted hover:text-ink" />}
        >
          <X aria-hidden="true" className="size-5" />
          <span className="sr-only">Close</span>
        </DialogClose>
      </DialogHeader>

      <div className="flex min-h-0 flex-col gap-5 overflow-y-auto overscroll-contain px-6 pt-5 pb-6">
        <DialogDescription className="text-sm leading-relaxed text-ink-muted">
          Update {item.name}&apos;s details and the modifiers the counter can add to it. Channel prices are set
          separately.
        </DialogDescription>

        <MenuItemFields
          idPrefix="edit-menu-item"
          values={values}
          onChange={set}
          errors={errors}
          photo={{
            preview,
            onSelect: photo.select,
            onRemove: photo.logo ? photo.clear : undefined,
            error: photo.error ?? undefined,
            hint: "JPG or PNG, up to 5 MB. Square photos fit the menu tiles best.",
          }}
          recipes={recipeOptions}
          modifierCatalog={modifierCatalog}
        />
      </div>

      <DialogFooter className="mx-0 mb-0 items-center border-hairline bg-transparent px-6 py-4 sm:justify-between">
        <p className={cn("hidden text-sm text-ink-muted sm:block", !changed && "invisible")} aria-live="polite">
          {changed ? "Unsaved changes" : "No changes yet"}
        </p>
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
          <DialogClose render={<Button type="button" variant="outline" size="lg" className="h-10 px-4 font-semibold" />}>
            Cancel
          </DialogClose>
          <Button type="submit" size="lg" className="h-10 px-4 font-semibold" disabled={!changed}>
            Save changes
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
