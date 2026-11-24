import { z } from "zod";

// Prisma sends Decimal(12, 2) prices as strings ("35" or "35.50").
const priceSchema = z.union([z.string(), z.number()]).transform(Number);

const channelSchema = z.enum(["DINE_IN", "TAKEAWAY", "GRABFOOD", "FOODPANDA"]);

/** A delivery channel's own price or on/off switch for one item. */
const channelOverrideSchema = z.object({
  menu_item_channel_id: z.uuid(),
  order_channel: channelSchema,
  price: priceSchema,
  is_available: z.boolean(),
});

/** A modifier offered on one item, at that item's price. */
const assignmentSchema = z.object({
  menu_item_modifier_id: z.uuid(),
  modifier_id: z.uuid(),
  additional_price: priceSchema,
  modifier: z.object({
    modifier_id: z.uuid(),
    code: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    is_active: z.boolean(),
  }),
});

/** GET /api/menu-catalog rows, and what creating or editing one returns. */
export const menuEntrySchema = z.object({
  menu_item_id: z.uuid(),
  brand_id: z.uuid(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  serving_description: z.string().nullable(),
  img_url: z.string(),
  base_price: priceSchema,
  is_available: z.boolean(),
  is_active: z.boolean(),
  recipe: z.object({
    recipe_id: z.uuid(),
    name: z.string(),
    is_active: z.boolean(),
  }),
  menuChannels: z.array(channelOverrideSchema),
  menuItemModifiers: z.array(assignmentSchema),
});

const countSchema = z.object({
  total: z.number().int(),
  unavailable: z.number().int(),
});

export const menuPageSchema = z.object({
  data: z.array(menuEntrySchema),
  meta: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
    counts: z.object({
      /** Keyed by brand_id, plus "all". */
      brands: z.record(z.string(), countSchema),
      availability: z.object({
        all: z.number().int(),
        available: z.number().int(),
        unavailable: z.number().int(),
      }),
    }),
  }),
});

/** The bare item the availability, deactivate and reactivate endpoints return. */
export const menuItemStatusSchema = z.object({
  menu_item_id: z.uuid(),
  is_available: z.boolean(),
  is_active: z.boolean(),
});

/** POST /api/assets */
export const uploadSchema = z.object({ key: z.string() });

export type MenuEntryRecord = z.infer<typeof menuEntrySchema>;
export type MenuPage = z.infer<typeof menuPageSchema>;
