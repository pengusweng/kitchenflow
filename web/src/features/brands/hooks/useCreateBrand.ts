import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { usePin } from "@/src/features/pin/hooks/usePin";
import { brandFormSchema, type BrandFormValues } from "../schemas/brandFormSchema";
import type { BrandResponse } from "../schemas/brandSchema";
import { createBrand, getBrand } from "../services/brands.service";
import { saveBrandErrorMessage } from "./brandErrors";
import { useLogoPicker } from "./useLogoPicker";

const EMPTY: BrandFormValues = { name: "", code: "" };

export function useCreateBrand(onCreated: (brand: BrandResponse) => void) {
  const { withPin } = usePin();
  const queryClient = useQueryClient();
  const logo = useLogoPicker();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: EMPTY,
    validators: { onChange: brandFormSchema },
    onSubmit: async ({ value, formApi }) => {
      setServerError(null);
      const input = brandFormSchema.parse(value);

      try {
        const saved = await withPin((pin) => createBrand(input, logo.logo?.file ?? null, pin), {
          title: "Confirm new brand",
          description: `Enter your PIN to create ${input.name}.`,
        });
        if (!saved) return; // PIN prompt cancelled: keep the form as it is.

        await queryClient.invalidateQueries({ queryKey: ["brands"] });
        // The create response holds the stored logo key; re-read it for a display URL.
        const brand = await getBrand(saved.brand_id).catch(() => saved);
        formApi.reset();
        logo.clear();
        onCreated(brand);
      } catch (error) {
        setServerError(saveBrandErrorMessage(error, input.code, "Unable to create the brand. Please try again."));
      }
    },
  });

  function reset() {
    form.reset();
    logo.clear();
    setServerError(null);
  }

  return { form, logo, serverError, reset };
}
