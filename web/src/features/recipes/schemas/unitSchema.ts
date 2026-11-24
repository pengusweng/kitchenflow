import { z } from "zod";

export const unitDimensionSchema = z.enum(["MASS", "VOLUME", "COUNT"]);

// One unit from GET /api/units or POST /api/units. to_base is a Decimal, which
// Prisma sends as a string ("1000"); accept a number too.
export const unitSchema = z.object({
  code: z.string(),
  name: z.string(),
  dimension: unitDimensionSchema,
  to_base: z.union([z.string(), z.number()]),
});

// GET /api/units response.
export const unitsPageSchema = z.object({
  data: z.array(unitSchema),
  meta: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});

export type UnitDimension = z.infer<typeof unitDimensionSchema>;
export type UnitResponse = z.infer<typeof unitSchema>;
