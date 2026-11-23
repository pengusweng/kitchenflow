import { z } from "zod";

// Prisma sends Decimal(12, 2) prices as strings ("35" or "35.50").
const priceSchema = z.union([z.string(), z.number()]).transform(Number);

/** A modifier as every endpoint returns it. */
export const modifierRecordSchema = z.object({
  modifier_id: z.uuid(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.iso.datetime(),
  modified_at: z.iso.datetime(),
});

const statusCountsSchema = z.object({
  all: z.number().int(),
  active: z.number().int(),
  inactive: z.number().int(),
});

/** GET /api/modifiers: each row also says how many menu items offer it. */
export const modifiersPageSchema = z.object({
  data: z.array(
    modifierRecordSchema.extend({
      _count: z.object({ menu_item_modifiers_modifier: z.number().int() }),
    }),
  ),
  meta: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
    counts: statusCountsSchema,
  }),
});

/** One menu item offering the modifier, at its own price. */
export const modifierUseRecordSchema = z.object({
  menu_item_modifier_id: z.uuid(),
  additional_price: priceSchema,
  is_available: z.boolean(),
  menu_item: z.object({
    menu_item_id: z.uuid(),
    brand_id: z.uuid(),
    code: z.string(),
    name: z.string(),
    is_active: z.boolean(),
  }),
});

/** GET /api/modifiers/:id */
export const modifierDetailSchema = modifierRecordSchema.extend({
  menu_item_modifiers_modifier: z.array(modifierUseRecordSchema),
});

export type ModifierRecord = z.infer<typeof modifierRecordSchema>;
export type ModifierListRecord = z.infer<typeof modifiersPageSchema>["data"][number];
export type ModifiersPage = z.infer<typeof modifiersPageSchema>;
export type ModifierUseRecord = z.infer<typeof modifierUseRecordSchema>;
export type ModifierDetailRecord = z.infer<typeof modifierDetailSchema>;
