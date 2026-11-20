import { z } from "zod";

// Mirrors the backend's CreateBrandDTO and UpdateBrandDTO limits so most
// mistakes are caught before the PIN prompt.
export const brandFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a brand name.").max(150, "Name can be at most 150 characters."),
  code: z.string().trim().min(1, "Enter a code.").max(4, "Code can be at most 4 characters."),
});

export type BrandFormValues = z.input<typeof brandFormSchema>;
export type BrandFormInput = z.output<typeof brandFormSchema>;

/** PATCH body: only the fields that changed. A null logo_url clears the logo. */
export type UpdateBrandInput = Partial<BrandFormInput> & { logo_url?: null };
