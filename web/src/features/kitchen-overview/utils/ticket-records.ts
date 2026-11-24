import type { MenuBrand } from "@/src/features/menu/utils/menu";
import type { KitchenTicketRecord, QcAttemptRecord } from "../schemas/kitchenTicketSchema";
import type { KitchenTicket, QcAttempt } from "./tickets";

/**
 * Today's tickets as the board shows them. Cancelled tickets never reach the
 * line, so they're dropped here.
 */
export function toKitchenTickets(records: KitchenTicketRecord[], brandFor: (id: string) => MenuBrand): KitchenTicket[] {
  return records.flatMap((record) => {
    const { status } = record;
    if (status === "CANCELLED") return [];
    return [
      {
        id: record.kitchen_ticket_id,
        number: record.ticket_number,
        orderCode: record.order_code,
        brand: brandFor(record.brand_id),
        channel: record.order_channel,
        stage: status,
        // Confirming the order creates its ticket, so the two match; created_at covers any order without one.
        orderSentAt: record.order_confirmed_at ?? record.created_at,
        createdAt: record.created_at,
        acknowledgedAt: record.acknowledged_at,
        preparationStartedAt: record.preparation_started_at,
        readyAt: record.ready_at,
        handedOverAt: record.handed_over_at,
        qcFailureCount: record.qc_failure_count,
        items: record.order_items.map((item) => ({
          id: item.order_item_id,
          name: item.item_name,
          quantity: item.quantity,
          notes: item.notes,
          modifiers: item.modifiers.map((modifier) => modifier.modifier_name),
        })),
      },
    ];
  });
}

/** A ticket's QC history, first check first; the API sends it newest first. */
export function toQcAttempts(records: QcAttemptRecord[]): QcAttempt[] {
  return records
    .map((record) => ({
      id: record.qc_attempt_id,
      number: record.attempt_number,
      status: record.status,
      checker: `${record.checker.first_name} ${record.checker.last_name}`.trim(),
      startedAt: record.started_at,
      completedAt: record.completed_at,
      rejections: record.rejections.map((rejection) => ({
        id: rejection.rejection_id,
        itemId: rejection.order_item_id,
        portion: rejection.portion_number,
        reason: rejection.rejection_reason,
        note: rejection.description,
        rejectedAt: rejection.rejected_at,
      })),
    }))
    .sort((a, b) => a.number - b.number);
}
