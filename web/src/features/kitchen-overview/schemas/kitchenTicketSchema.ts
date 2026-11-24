import { z } from "zod";

const STATUSES = [
  "QUEUED",
  "ACKNOWLEDGED",
  "PREPARING",
  "REWORKING",
  "FOR_CHECKING",
  "CHECKING",
  "READY",
  "HANDED_OVER",
  "CANCELLED",
] as const;

const CHANNELS = ["DINE_IN", "TAKEAWAY", "GRABFOOD", "FOODPANDA"] as const;

/** One ticket from GET /kitchen-ticket/today (and each event of its stream). */
export const kitchenTicketRecordSchema = z.object({
  kitchen_ticket_id: z.string(),
  order_code: z.string(),
  ticket_number: z.string(),
  status: z.enum(STATUSES),
  brand_id: z.string(),
  order_channel: z.enum(CHANNELS),
  order_confirmed_at: z.string().nullable(),
  qc_failure_count: z.number().int().nonnegative(),
  acknowledged_at: z.string().nullable(),
  preparation_started_at: z.string().nullable(),
  ready_at: z.string().nullable(),
  handed_over_at: z.string().nullable(),
  created_at: z.string(),
  order_items: z.array(
    z.object({
      order_item_id: z.string(),
      item_name: z.string(),
      quantity: z.number().int().positive(),
      notes: z.string().nullable(),
      modifiers: z.array(z.object({ modifier_name: z.string() })),
    }),
  ),
});

export const kitchenTicketListSchema = z.array(kitchenTicketRecordSchema);

/** One attempt from GET /kitchen-qc/ticket/:ticketId. */
export const qcAttemptRecordSchema = z.object({
  qc_attempt_id: z.string(),
  attempt_number: z.number().int().positive(),
  status: z.enum(["IN_PROGRESS", "PASSED", "FAILED"]),
  started_at: z.string(),
  completed_at: z.string().nullable(),
  checker: z.object({ first_name: z.string(), last_name: z.string() }),
  rejections: z.array(
    z.object({
      rejection_id: z.string(),
      order_item_id: z.string(),
      portion_number: z.number().int().positive(),
      rejection_reason: z.enum(["INCOMPLETE"]),
      description: z.string(),
      rejected_at: z.string(),
    }),
  ),
});

export const qcHistorySchema = z.array(qcAttemptRecordSchema);

/** GET /handoff/kitchen-ticket/:kitchenTicketId; the image URLs are signed and expire. */
export const handoffSchema = z.object({ img_urls: z.array(z.string()) });

export type KitchenTicketRecord = z.infer<typeof kitchenTicketRecordSchema>;
export type QcAttemptRecord = z.infer<typeof qcAttemptRecordSchema>;
