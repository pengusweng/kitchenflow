import { describe, expect, test } from "vitest";
import type { OrderDetailRecord, OrderSummaryRecord } from "../schemas/orderSchema";
import {
  lineTotal,
  orderTimeline,
  orderTotal,
  toOrderDetail,
  toOrderSummary,
  type OrderDetail,
} from "./orders";

const BRAND_ID = "11111111-1111-4111-8111-111111111111";
const ORDER_ID = "22222222-2222-4222-8222-222222222222";
const ITEM_ID = "33333333-3333-4333-8333-333333333333";
const MODIFIER_ID = "44444444-4444-4444-8444-444444444444";
const TICKET_ID = "55555555-5555-4555-8555-555555555555";

const summaryRecord: OrderSummaryRecord = {
  order_id: ORDER_ID,
  order_code: "GC-00001",
  order_date: "2026-11-14T16:00:00.000Z",
  brand_id: BRAND_ID,
  order_channel: "DINE_IN",
  status: "DRAFT",
  payment_status: "UNPAID",
  payment_method: "CASH",
  payment_reference: null,
  table_reference: "T-3",
  external_order_reference: null,
  notes: null,
  cancellation_reason: null,
  confirmed_at: null,
  completed_at: null,
  cancelled_at: null,
  created_at: "2026-11-13T20:00:00.000Z",
  brand: { brand_id: BRAND_ID, code: "GC", name: "Grill Kitchen" },
};

const detailRecord: OrderDetailRecord = {
  ...summaryRecord,
  status: "CANCELLED",
  payment_status: "REFUNDED",
  payment_method: "CARD",
  payment_reference: "ref-1",
  cancellation_reason: "Guest changed their mind",
  confirmed_at: "2026-11-13T20:01:00.000Z",
  cancelled_at: "2026-11-13T20:06:00.000Z",
  order_items_order: [
    {
      order_item_id: ITEM_ID,
      item_name: "Chicken",
      quantity: 2,
      unit_price: 100,
      notes: "No onions",
      order_item_modifiers_order_item: [
        { order_item_modifier_id: MODIFIER_ID, modifier_name: "Extra sauce", additional_price: 20 },
        { order_item_modifier_id: "66666666-6666-4666-8666-666666666666", modifier_name: "No onions", additional_price: 0 },
      ],
    },
  ],
  kitchen_tickets_order: {
    kitchen_ticket_id: TICKET_ID,
    ticket_number: "T-001",
    acknowledged_at: "2026-11-13T20:02:00.000Z",
    preparation_started_at: "2026-11-13T20:03:00.000Z",
    ready_at: "2026-11-13T20:04:00.000Z",
    handed_over_at: "2026-11-13T20:05:00.000Z",
  },
};

describe("order mapping", () => {
  test("toOrderSummary uses the Manila business date and the joined brand", () => {
    const summary = toOrderSummary(summaryRecord);

    expect(summary).toMatchObject({
      id: ORDER_ID,
      code: "GC-00001",
      date: "2026-11-14",
      placedAt: "2026-11-13T20:00:00.000Z",
      brandId: BRAND_ID,
      brand: "Grill Kitchen",
      table: "T-3",
      paymentMethod: "CASH",
    });
  });

  test("toOrderDetail refreshes mutable columns and maps lines and ticket", () => {
    const detail = toOrderDetail(toOrderSummary(summaryRecord), detailRecord);

    expect(detail).toMatchObject({
      id: ORDER_ID,
      status: "CANCELLED",
      payment: "REFUNDED",
      paymentMethod: "CARD",
      paymentReference: "ref-1",
      cancellationReason: "Guest changed their mind",
      items: [{
        id: ITEM_ID,
        name: "Chicken",
        quantity: 2,
        unitPrice: 100,
        notes: "No onions",
        modifiers: [
          { id: MODIFIER_ID, name: "Extra sauce", price: 20 },
          { name: "No onions", price: 0 },
        ],
      }],
      ticket: { id: TICKET_ID, number: "T-001" },
    });
  });
});

test("lineTotal and orderTotal include modifiers before multiplying by quantity", () => {
  const detail = toOrderDetail(toOrderSummary(summaryRecord), detailRecord);

  expect(lineTotal(detail.items[0])).toBe(240);
  expect(orderTotal(detail)).toBe(240);
});

test("orderTimeline lists only reached steps in time order, with the cancellation reason", () => {
  const detail: OrderDetail = toOrderDetail(toOrderSummary(summaryRecord), detailRecord);

  expect(orderTimeline(detail).map(({ key }) => key)).toEqual([
    "placed",
    "confirmed",
    "acknowledged",
    "preparing",
    "ready",
    "handed-over",
    "cancelled",
  ]);
  expect(orderTimeline(detail).at(-1)).toMatchObject({
    label: "Cancelled",
    detail: "Guest changed their mind",
    cancelled: true,
  });
});

test("orderTimeline omits kitchen steps when the order has no ticket", () => {
  const detail = toOrderDetail(toOrderSummary(summaryRecord), {
    ...detailRecord,
    status: "CONFIRMED",
    cancelled_at: null,
    cancellation_reason: null,
    kitchen_tickets_order: null,
  });

  expect(orderTimeline(detail).map(({ key }) => key)).toEqual(["placed", "confirmed"]);
});
