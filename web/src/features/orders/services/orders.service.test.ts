import { afterEach, describe, expect, test, vi } from "vitest";
import { getOrderPayment } from "./orders.service";

const ORDER_ID = "00000000-0000-4000-8000-000000000010";

function respondWith(status: number, body: unknown = null) {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getOrderPayment", () => {
  test("reads the order's payment method and reference", async () => {
    const fetch = respondWith(200, {
      payment_id: "00000000-0000-4000-8000-000000000020",
      order_id: ORDER_ID,
      payment_method: "PLATFORM_SETTLED",
      payment_reference: "GF-1234",
      amount: "290.00",
      amount_tendered: "290.00",
      received_by_name: "Juan Dela Cruz",
    });

    await expect(getOrderPayment(ORDER_ID)).resolves.toEqual({
      payment_method: "PLATFORM_SETTLED",
      payment_reference: "GF-1234",
    });
    expect(fetch).toHaveBeenCalledWith(`/api/payments/order/${ORDER_ID}`, expect.any(Object));
  });

  test.each([
    [404, "the order has no payment yet"],
    [403, "the viewer's role cannot read payments"],
  ])("returns null on %i, when %s", async (status) => {
    respondWith(status);

    await expect(getOrderPayment(ORDER_ID)).resolves.toBeNull();
  });

  test("fails on any other error status", async () => {
    respondWith(500);

    await expect(getOrderPayment(ORDER_ID)).rejects.toThrow("Unable to load this payment. Please try again.");
  });

  test("fails on a payment the schema does not recognise", async () => {
    respondWith(200, { payment_method: "BARTER", payment_reference: null });

    await expect(getOrderPayment(ORDER_ID)).rejects.toThrow("The server returned an invalid payment.");
  });
});
