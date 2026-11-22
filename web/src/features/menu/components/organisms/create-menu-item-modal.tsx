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
import FormField from "@/src/features/brands/components/molecules/form-field";
import { type LogoPreview } from "@/src/features/brands/components/molecules/logo-field";
import { useLogoPicker } from "@/src/features/brands/hooks/useLogoPicker";
import type { MenuBrand, MenuItem, MenuModifierOption } from "../../utils/menu";
import {
  emptyFormValues,
  hasErrors,
  newMenuItem,
  suggestCode,
  validateNewMenuItem,
  type MenuItemFormValues,
  type NewMenuItemErrors,
} from "../../utils/menu-form";
import { modifierPriceId } from "../molecules/modifier-editor";
import MenuItemFields, { FIELD_ORDER, SELECT } from "./menu-item-fields";

type CreateMenuItemModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (item: MenuItem) => void;
  brands: MenuBrand[];
  /** Brand code to start on, e.g. the one the page is filtered to. */
  defaultBrand?: string;
  /** Recipes a brand can link to. */
  recipesFor: (brandCode: string) => string[];
  modifierCatalog: MenuModifierOption[];
  /** Codes menu items already use. */
  takenCodes: Set<string>;
};

// DESIGN.md › Elevation: dialogs get Shadow 3. Shadows vanish on the dark
// surface, so dark mode swaps it for a hairline edge instead of stacking both.
const SURFACE =
  "shadow-[0_8px_24px_rgba(25,41,62,0.14),0_2px_8px_rgba(25,41,62,0.08)] dark:shadow-none dark:ring-1 dark:ring-hairline";

const ID = "create-menu-item";

export default function CreateMenuItemModal({ open, onOpenChange, ...formProps }: CreateMenuItemModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={`flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-xl bg-card p-0 text-ink ring-0 sm:max-w-xl ${SURFACE}`}
      >
        {/* The dialog unmounts its content when closed, so every open starts blank. */}
        <CreateMenuItemForm {...formProps} />
      </DialogContent>
    </Dialog>
  );
}

function CreateMenuItemForm({
  onCreated,
  brands,
  defaultBrand,
  recipesFor,
  modifierCatalog,
  takenCodes,
}: Omit<CreateMenuItemModalProps, "open" | "onOpenChange">) {
  const [brandCode, setBrandCode] = useState(defaultBrand);
  const [values, setValues] = useState<MenuItemFormValues>(emptyFormValues);
  // The code follows the brand and name until someone types their own.
  const [codeEdited, setCodeEdited] = useState(false);
  // Errors show after the first add attempt, then follow every keystroke.
  const [submitted, setSubmitted] = useState(false);
  const photo = useLogoPicker("Photos");

  const brand = brands.find((b) => b.code === brandCode);
  const recipes = brandCode ? recipesFor(brandCode) : [];
  const check = () => validateNewMenuItem(values, takenCodes, { brand: brandCode, hasPhoto: photo.logo !== null });
  const errors: NewMenuItemErrors = submitted ? check() : {};

  const set = <K extends keyof MenuItemFormValues>(key: K, value: MenuItemFormValues[K]) =>
    setValues((current) => {
      const next = { ...current, [key]: value };
      if (key === "name" && !codeEdited) next.code = suggestCode(brandCode, next.name);
      return next;
    });

  const change = <K extends keyof MenuItemFormValues>(key: K, value: MenuItemFormValues[K]) => {
    // Clearing the code hands it back to the suggestion.
    if (key === "code") setCodeEdited(value !== "");
    set(key, value);
  };

  const changeBrand = (code: string) => {
    setBrandCode(code);
    setValues((current) => ({
      ...current,
      code: codeEdited ? current.code : suggestCode(code, current.name),
      // Each brand has its own recipes, so a recipe from the last brand can't stay.
      recipe: recipesFor(code).includes(current.recipe) ? current.recipe : "",
    }));
  };

  const preview: LogoPreview | null = photo.logo
    ? { url: photo.logo.previewUrl, name: photo.logo.file.name, size: photo.logo.file.size }
    : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const found = check();
    if (hasErrors(found) || !brand || !photo.logo) {
      focusFirstProblem(found);
      return;
    }
    // Static UI: a fresh object URL for the picked photo, since the picker
    // releases its own as soon as this form closes.
    onCreated(newMenuItem(`new-${crypto.randomUUID()}`, brand, values, URL.createObjectURL(photo.logo.file)));
  };

  return (
    <form noValidate className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
      <DialogHeader className="flex-row items-center justify-between gap-4 border-b border-hairline py-3 pr-3 pl-6">
        <DialogTitle className="text-base font-semibold text-ink">Add menu item</DialogTitle>
        <DialogClose
          render={<Button type="button" variant="ghost" size="icon-lg" className="size-10 text-ink-muted hover:text-ink" />}
        >
          <X aria-hidden="true" className="size-5" />
          <span className="sr-only">Close</span>
        </DialogClose>
      </DialogHeader>

      <div className="flex min-h-0 flex-col gap-5 overflow-y-auto overscroll-contain px-6 pt-5 pb-6">
        <DialogDescription className="text-sm leading-relaxed text-ink-muted">
          New items start active and available. Channel prices are set after it&apos;s added.
        </DialogDescription>

        <FormField id={`${ID}-brand`} label="Brand" error={errors.brand}>
          <div className="relative">
            {brand ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-2.5 -translate-y-1/2 rounded-full"
                style={{ backgroundColor: brand.accent }}
              />
            ) : null}
            <select
              id={`${ID}-brand`}
              value={brandCode ?? ""}
              onChange={(e) => changeBrand(e.target.value)}
              aria-invalid={Boolean(errors.brand)}
              aria-describedby={errors.brand ? `${ID}-brand-message` : undefined}
              className={cn(SELECT, brand ? "pl-8" : "text-ink-muted")}
            >
              {!brand ? (
                <option value="" disabled>
                  Choose a brand
                </option>
              ) : null}
              {brands.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-muted"
            />
          </div>
        </FormField>

        <MenuItemFields
          idPrefix={ID}
          values={values}
          onChange={change}
          errors={errors}
          photo={{
            preview,
            onSelect: photo.select,
            onRemove: photo.logo ? photo.clear : undefined,
            error: photo.error ?? errors.photo,
            hint: "JPG or PNG, up to 5 MB. Square photos fit the menu tiles best.",
          }}
          codeHint={codeEdited ? "Must be unique across every brand." : "Filled in from the brand and name."}
          recipes={recipes}
          recipePlaceholder={brand ? "Choose a recipe" : "Choose a brand first"}
          recipeDisabled={!brand}
          modifierCatalog={modifierCatalog}
          tagNewModifiers={false}
        />
      </div>

      <DialogFooter className="mx-0 mb-0 items-center border-hairline bg-transparent px-6 py-4">
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
          <DialogClose render={<Button type="button" variant="outline" size="lg" className="h-10 px-4 font-semibold" />}>
            Cancel
          </DialogClose>
          <Button type="submit" size="lg" className="h-10 px-4 font-semibold">
            Add item
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

// Brand first, then the photo, then the fields in the order they appear.
function focusFirstProblem(found: NewMenuItemErrors) {
  if (found.brand) return document.getElementById(`${ID}-brand`)?.focus();
  if (found.photo) {
    // The file input itself is hidden; its zone's button opens the picker.
    return document.getElementById(`${ID}-photo`)?.parentElement?.querySelector("button")?.focus();
  }
  const first = FIELD_ORDER.find((name) => name in found);
  const firstModifier = Object.keys(found.modifiers ?? {})[0];
  document.getElementById(first ? `${ID}-${first}` : modifierPriceId(firstModifier))?.focus();
}
