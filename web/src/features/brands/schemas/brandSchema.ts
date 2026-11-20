import { z } from "zod";

// GET /api/brands/:brandId (and each item of GET /api/brands). Uploaded logo
// keys arrive resolved to display URLs; brands without a logo send null.
export const brandSchema = z.object({
  brand_id: z.uuid(),
  code: z.string(),
  name: z.string(),
  logo_url: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.iso.datetime(),
  modified_at: z.iso.datetime(),
});

export type BrandResponse = z.infer<typeof brandSchema>;
