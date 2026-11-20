import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { usePin } from "@/src/features/pin/hooks/usePin";
import { brandFormSchema, type BrandFormValues, type UpdateBrandInput } from "../schemas/brandFormSchema";
import type { BrandResponse } from "../schemas/brandSchema";
import { getBrand, updateBrand } from "../services/brands.service";
import type { Brand } from "../utils/brands";
import type { SelectedLogo } from "../utils/logo";
import { saveBrandErrorMessage } from "./brandErrors";
import { useLogoPicker } from "./useLogoPicker";

/** The fields that differ from the saved brand; empty when nothing changed. */
export function changedFields(brand: Brand, values: BrandFormValues, removeLogo: boolean): UpdateBrandInput {
  const changes: UpdateBrandInput = {};
  const name = values.name.trim();
  const code = values.code.trim();
  if (name !== brand.name) changes.name = name;
  if (code !== brand.code) changes.code = code;
  if (removeLogo) changes.logo_url = null;
  return changes;
}

export function hasChanges(changes: UpdateBrandInput, newLogo: SelectedLogo | null): boolean {
  return newLogo !== null || Object.keys(changes).length > 0;
}

export function useEditBrand(brand: Brand, onSaved: (brand: BrandResponse) => void) {
  const { withPin } = usePin();
  const queryClient = useQueryClient();
  const logo = useLogoPicker();
  // True once the saved logo is removed without a replacement.
  const [removeLogo, setRemoveLogo] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { name: brand.name, code: brand.code } satisfies BrandFormValues,
    validators: { onChange: brandFormSchema },
    onSubmit: async ({ value }) => {
      setServerError(null);
      const file = logo.logo?.file ?? null;
      const changes = changedFields(brand, value, removeLogo && !file);
      if (!hasChanges(changes, logo.logo)) return;

      try {
        const saved = await withPin((pin) => updateBrand(brand.id, changes, file, pin), {
          title: "Save changes",
          description: `Enter your PIN to save changes to ${brand.name}.`,
        });
        if (!saved) return; // PIN prompt cancelled: keep the edits on screen.

        await queryClient.invalidateQueries({ queryKey: ["brands"] });
        // The update response holds the stored logo key; re-read it for a display URL.
        onSaved(await getBrand(saved.brand_id).catch(() => saved));
      } catch (error) {
        setServerError(saveBrandErrorMessage(error, changes.code, "Unable to save the changes. Please try again."));
      }
    },
  });

  return {
    form,
    logo,
    removeLogo,
    serverError,
    /** Drops a newly picked file first; a second remove clears the saved logo. */
    remove() {
      if (logo.logo) logo.clear();
      else setRemoveLogo(true);
    },
    select(file: File) {
      logo.select(file);
    },
  };
}
