import { describe, expect, test } from "vitest";
import type { MenuBrand } from "@/src/features/menu/utils/menu";
import {
  kitchenTicketListSchema,
  qcHistorySchema,
  type KitchenTicketRecord,
  type QcAttemptRecord,
} from "../schemas/kitchenTicketSchema";
import { toKitchenTickets, toQcAttempts } from "./ticket-records";

const BRAND: MenuBrand = { id: "brand-1", code: "GC", name: "Gamcheon", accent: "#3D5A80" };
const brandFor = (id: string): MenuBrand =>
  id === BRAND.id ? BRAND : { id, code: "", name: "Unknown brand", accent: "#8A94A6" };

function record(extra: Partial<KitchenTicketRecord> = {}): KitchenTicketRecord {
  return {
    kitchen_ticket_id: "ticket-1",
    order_code: "GC-0001",
    ticket_number: "T-001",
    status: "PREPARING",
    brand_id: BRAND.id,
    order_channel: "GRABFOOD",
    order_confirmed_at: "2026-11-23T09:00:00.000Z",
    qc_failure_count: 1,
    acknowledged_at: "2026-11-23T09:01:00.000Z",
    preparation_started_at: "2026-11-23T09:02:00.000Z",
    ready_at: null,
    handed_over_at: null,
    created_at: "2026-11-23T09:00:00.500Z",
    order_items: [
      {
        order_item_id: "item-1",
        item_name: "Bibimbap",
        quantity: 2,
        notes: "No egg",
        modifiers: [{ modifier_name: "Extra spicy" }, { modifier_name: "Large" }],
      },
    ],
    ...extra,
  };
}

describe("toKitchenTickets", () => {
  test("maps a ticket record onto the board's model", () => {
    const [ticket] = toKitchenTickets([record()], brandFor);
    expect(ticket).toEqual({
      id: "ticket-1",
      number: "T-001",
      orderCode: "GC-0001",
      brand: BRAND,
      channel: "GRABFOOD",
      stage: "PREPARING",
      orderSentAt: "2026-11-23T09:00:00.000Z",
      createdAt: "2026-11-23T09:00:00.500Z",
      acknowledgedAt: "2026-11-23T09:01:00.000Z",
      preparationStartedAt: "2026-11-23T09:02:00.000Z",
      readyAt: null,
      handedOverAt: null,
      qcFailureCount: 1,
      items: [{ id: "item-1", name: "Bibimbap", quantity: 2, notes: "No egg", modifiers: ["Extra spicy", "Large"] }],
    });
  });

  test("drops cancelled tickets, which never reach the line", () => {
    const tickets = toKitchenTickets([record(), record({ kitchen_ticket_id: "gone", status: "CANCELLED" })], brandFor);
    expect(tickets.map((t) => t.id)).toEqual(["ticket-1"]);
  });

  test("times an order with no confirmation from its ticket's creation", () => {
    const [ticket] = toKitchenTickets([record({ order_confirmed_at: null })], brandFor);
    expect(ticket.orderSentAt).toBe("2026-11-23T09:00:00.500Z");
  });

  test("names a brand it can't find instead of failing", () => {
    const [ticket] = toKitchenTickets([record({ brand_id: "brand-x" })], brandFor);
    expect(ticket.brand.name).toBe("Unknown brand");
  });
});

describe("toQcAttempts", () => {
  const attempt = (n: number, extra: Partial<QcAttemptRecord> = {}): QcAttemptRecord => ({
    qc_attempt_id: `qc-${n}`,
    attempt_number: n,
    status: "FAILED",
    started_at: `2026-11-23T09:1${n}:00.000Z`,
    completed_at: `2026-11-23T09:1${n}:30.000Z`,
    checker: { first_name: "Ana", last_name: "Santos" },
    rejections: [],
    ...extra,
  });

  test("puts the first check first and names the checker", () => {
    const attempts = toQcAttempts([attempt(2, { status: "PASSED" }), attempt(1)]);
    expect(attempts.map((a) => [a.number, a.status, a.checker])).toEqual([
      [1, "FAILED", "Ana Santos"],
      [2, "PASSED", "Ana Santos"],
    ]);
  });

  test("keeps each rejected portion with its note", () => {
    const [first] = toQcAttempts([
      attempt(1, {
        rejections: [
          {
            rejection_id: "r-1",
            order_item_id: "item-1",
            portion_number: 2,
            rejection_reason: "INCOMPLETE",
            description: "Missing side.",
            rejected_at: "2026-11-23T09:11:30.000Z",
          },
        ],
      }),
    ]);
    expect(first.rejections).toEqual([
      {
        id: "r-1",
        itemId: "item-1",
        portion: 2,
        reason: "INCOMPLETE",
        note: "Missing side.",
        rejectedAt: "2026-11-23T09:11:30.000Z",
      },
    ]);
  });
});

test("the schemas accept the API's payloads and ignore fields the board doesn't use", () => {
  const extra = { preparer_id: null, order_id: "o-1", modified_at: "2026-11-23T09:00:00.000Z" };
  expect(kitchenTicketListSchema.safeParse([{ ...record(), ...extra }]).success).toBe(true);
  expect(kitchenTicketListSchema.safeParse([{ ...record(), status: "LOST" }]).success).toBe(false);
  expect(
    qcHistorySchema.safeParse([
      {
        qc_attempt_id: "qc-1",
        kitchen_ticket_id: "ticket-1",
        checker_id: "u-1",
        attempt_number: 1,
        status: "IN_PROGRESS",
        started_at: "2026-11-23T09:11:00.000Z",
        completed_at: null,
        checker: { first_name: "Ana", last_name: "Santos" },
        rejections: [],
      },
    ]).success,
  ).toBe(true);
});
