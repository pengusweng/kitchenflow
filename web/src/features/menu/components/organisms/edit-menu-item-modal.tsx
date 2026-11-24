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
import { useBrandRecipes, useModifierOptions } from "../../hooks/useMenu";
import type { MenuItem } from "../../utils/menu";
import { menuSaveError, type MenuSaveError } from "../../utils/menu-errors";
import {
  hasErrors,
  hasFormChanges,
  toFormValues,
  validateMenuItemForm,
  type MenuItemFormErrors,
  type MenuItemFormValues,
} from "../../utils/menu-form";
import MenuItemFields, { firstProblemId } from "./menu-item-fields";

type EditMenuItemModalProps = {
  item: MenuItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Saves the form; rejects with the API's error when the save is refused. */
  onSubmit: (values: MenuItemFormValues, photo: File | null) => Promise<unknown>;
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

const ID = "edit-menu-item";

function EditMenuItemForm({
  item,
  onSubmit,
}: Omit<EditMenuItemModalProps, "item" | "open" | "onOpenChange"> & {
  item: MenuItem;
}) {
  const [values, setValues] = useState<MenuItemFormValues>(() => toFormValues(item));
  // Errors show after the first save attempt, then follow every keystroke.
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  // What the API refused, until the field it's about changes.
  const [saveError, setSaveError] = useState<(MenuSaveError & { sent: unknown }) | null>(null);
  const photo = useLogoPicker("Photos");
  const { recipes, isPending: recipesLoading } = useBrandRecipes(item.brand.id);
  const modifiers = useModifierOptions();

  const fieldValue = (field: NonNullable<MenuSaveError["field"]>) =>
    field === "photo" ? photo.logo?.file : values[field];
  const serverError =
    saveError && (!saveError.field || fieldValue(saveError.field) === saveError.sent) ? saveError : null;
  const errors: MenuItemFormErrors = submitted ? validateMenuItemForm(values) : {};
  if ((serverError?.field === "code" || serverError?.field === "recipeId") && !errors[serverError.field])
    errors[serverError.field] = serverError.message;
  const changed = hasFormChanges(item, values, photo.logo !== null);
  const set = <K extends keyof MenuItemFormValues>(key: K, value: MenuItemFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  let preview: LogoPreview | null = null;
  if (photo.logo)
    preview = {
      url: photo.logo.previewUrl,
      name: photo.logo.file.name,
      size: photo.logo.file.size,
    };
  else if (item.imageUrl) preview = { url: item.imageUrl, name: "Current photo" };

  // Keep the current recipe on the list even once it's inactive, so the form
  // doesn't silently swap it; saving a different one needs an active recipe.
  const recipeOptions = recipes.some((r) => r.id === item.recipe.id)
    ? recipes
    : [
        {
          id: item.recipe.id,
          name: item.recipe.active ? item.recipe.name : `${item.recipe.name} (inactive)`,
        },
        ...recipes,
      ];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSubmitted(true);
    const found = validateMenuItemForm(values);
    if (hasErrors(found)) {
      const target = firstProblemId(ID, found);
      if (target) document.getElementById(target)?.focus();
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await onSubmit(values, photo.logo?.file ?? null);
    } catch (error) {
      const reason = menuSaveError(error);
      setSaveError({
        ...reason,
        sent: reason.field ? fieldValue(reason.field) : undefined,
      });
      if (reason.field && reason.field !== "photo") document.getElementById(`${ID}-${reason.field}`)?.focus();
      setSaving(false);
    }
  };

  return (
    <form noValidate className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
      <DialogHeader className="flex-row items-center justify-between gap-4 border-b border-hairline py-3 pr-3 pl-6">
        <DialogTitle className="text-base font-semibold text-ink">Edit menu item</DialogTitle>
        <DialogClose
          render={
            <Button type="button" variant="ghost" size="icon-lg" className="size-10 text-ink-muted hover:text-ink" />
          }
        >
          <X aria-hidden="true" className="size-5" />
          <span className="sr-only">Close</span>
        </DialogClose>
      </DialogHeader>

      <div className="flex min-h-0 flex-col gap-5 overflow-y-auto overscroll-contain px-6 pt-5 pb-6">
        <DialogDescription className="text-sm leading-relaxed text-ink-muted">
          Update {item.name}&apos;s details, delivery prices and the modifiers the counter can add to it.
        </DialogDescription>

        <MenuItemFields
          idPrefix={ID}
          values={values}
          onChange={set}
          errors={errors}
          photo={{
            preview,
            onSelect: photo.select,
            onRemove: photo.logo ? photo.clear : undefined,
            error: photo.error ?? (serverError?.field === "photo" ? serverError.message : undefined),
            hint: "JPG or PNG, up to 5 MB. Square photos fit the menu tiles best.",
          }}
          recipes={recipeOptions}
          recipePlaceholder={recipesLoading ? "Loading recipes…" : undefined}
          modifierCatalog={modifiers.options}
          modifierCatalogLoading={modifiers.isPending}
        />
      </div>

      {serverError && !serverError.field ? (
        <p role="alert" className="px-6 pb-3 text-sm leading-5 text-danger-ink">
          {serverError.message}
        </p>
      ) : null}

      <DialogFooter className="mx-0 mb-0 items-center border-hairline bg-transparent px-6 py-4 sm:justify-between">
        <p className={cn("hidden text-sm text-ink-muted sm:block", !changed && "invisible")} aria-live="polite">
          {changed ? "Unsaved changes" : "No changes yet"}
        </p>
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
          <DialogClose
            render={<Button type="button" variant="outline" size="lg" className="h-10 px-4 font-semibold" />}
          >
            Cancel
          </DialogClose>
          <Button type="submit" size="lg" className="h-10 px-4 font-semibold" disabled={!changed || saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
