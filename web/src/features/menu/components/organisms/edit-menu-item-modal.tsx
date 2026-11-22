"use client";

import { ChevronDown, X } from "lucide-react";
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
import LogoField, { type LogoPreview } from "@/src/features/brands/components/molecules/logo-field";
import { useLogoPicker } from "@/src/features/brands/hooks/useLogoPicker";
import type { MenuItem, MenuModifierOption } from "../../utils/menu";
import {
  applyMenuItemEdit,
  hasErrors,
  hasFormChanges,
  LIMITS,
  toFormValues,
  validateMenuItemForm,
  type MenuItemFormErrors,
  type MenuItemFormValues,
} from "../../utils/menu-form";
import ModifierEditor, { modifierPriceId } from "../molecules/modifier-editor";
import PriceInput from "../molecules/price-input";

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

const TEXTAREA =
  "min-h-24 w-full resize-y rounded-lg border border-input bg-field px-3 py-2.5 text-base leading-6 text-ink caret-primary outline-none transition-colors placeholder:text-ink-muted/80 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-sm";

// Field ids in form order, so a failed save can move focus to the first problem.
const FIELD_ORDER = ["name", "code", "basePrice", "servingDescription", "recipe", "description"] as const;

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

  const textField = (
    name: "name" | "servingDescription",
    label: string,
    options: { maxLength: number; hint?: string; placeholder?: string },
  ) => {
    const id = `edit-menu-item-${name}`;
    const error = errors[name];
    return (
      <FormField id={id} label={label} hint={options.hint} error={error}>
        <Input
          id={id}
          autoComplete="off"
          maxLength={options.maxLength}
          placeholder={options.placeholder}
          value={values[name]}
          onChange={(e) => set(name, e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={fieldMessageId(id, Boolean(error || options.hint))}
        />
      </FormField>
    );
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

        <FormField
          id="edit-menu-item-photo"
          label="Photo"
          hint="JPG or PNG, up to 5 MB. Square photos fit the menu tiles best."
          error={photo.error ?? undefined}
        >
          <LogoField
            id="edit-menu-item-photo"
            preview={preview}
            onSelect={photo.select}
            onRemove={photo.logo ? photo.clear : undefined}
            invalid={Boolean(photo.error)}
            shape="square"
            previewAlt="Menu item photo preview"
          />
        </FormField>

        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] sm:gap-4">
          {textField("name", "Name", { maxLength: LIMITS.name })}

          <FormField id="edit-menu-item-code" label="Code" error={errors.code}>
            <Input
              id="edit-menu-item-code"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={LIMITS.code}
              value={values.code}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
              aria-invalid={Boolean(errors.code)}
              aria-describedby={fieldMessageId("edit-menu-item-code", Boolean(errors.code))}
              className="font-mono text-sm tracking-[0.04em] uppercase md:text-sm"
            />
          </FormField>
        </div>

        <div className="grid gap-5 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] sm:gap-4">
          <FormField id="edit-menu-item-basePrice" label="Base price" error={errors.basePrice}>
            <PriceInput
              id="edit-menu-item-basePrice"
              value={values.basePrice}
              onChange={(e) => set("basePrice", e.target.value)}
              aria-invalid={Boolean(errors.basePrice)}
              aria-describedby={fieldMessageId("edit-menu-item-basePrice", Boolean(errors.basePrice))}
            />
          </FormField>
          {textField("servingDescription", "Serving", {
            maxLength: LIMITS.servingDescription,
            placeholder: "e.g. Good for 2",
          })}
        </div>

        <FormField id="edit-menu-item-recipe" label="Recipe" hint="What the kitchen follows when this item is ordered.">
          <div className="relative">
            <select
              id="edit-menu-item-recipe"
              value={values.recipe}
              onChange={(e) => set("recipe", e.target.value)}
              aria-describedby="edit-menu-item-recipe-message"
              className="h-12 w-full cursor-pointer appearance-none truncate rounded-lg border border-input bg-field pr-9 pl-3 text-base text-ink outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15"
            >
              {recipeOptions.map((recipe) => (
                <option key={recipe} value={recipe}>
                  {recipe}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-muted"
            />
          </div>
        </FormField>

        <FormField
          id="edit-menu-item-description"
          label="Description"
          hint={`Optional. ${values.description.trim().length} of ${LIMITS.description} characters.`}
          error={errors.description}
        >
          <textarea
            id="edit-menu-item-description"
            rows={3}
            maxLength={LIMITS.description}
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            aria-invalid={Boolean(errors.description)}
            aria-describedby="edit-menu-item-description-message"
            className={TEXTAREA}
          />
        </FormField>

        <div className="border-t border-hairline pt-5">
          <ModifierEditor
            drafts={values.modifiers}
            onChange={(modifiers) => set("modifiers", modifiers)}
            catalog={modifierCatalog}
            errors={errors.modifiers}
          />
        </div>
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
