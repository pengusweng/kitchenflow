import { z } from "zod";

// GET /api/brands/:brandId and each item of GET /api/brands resolve uploaded
// logo keys to display URLs. Create, update and deactivate return the stored
// key instead, so a saved brand is re-read before its logo is shown.
export const brandSchema = z.object({
  brand_id: z.uuid(),
  code: z.string(),
  name: z.string(),
  logo_url: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.iso.datetime(),
  modified_at: z.iso.datetime(),
});

const statusCountsSchema = z.object({
  all: z.number().int(),
  active: z.number().int(),
  inactive: z.number().int(),
});

// GET /api/brands response.
export const brandsPageSchema = z.object({
  data: z.array(brandSchema),
  meta: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
    counts: statusCountsSchema,
  }),
});

export type BrandResponse = z.infer<typeof brandSchema>;
export type BrandsPage = z.infer<typeof brandsPageSchema>;
