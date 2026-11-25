import { describe, expect, test } from "vitest";
import { ApiError } from "./api-error";

describe("ApiError.fromResponse", () => {
  test("keeps the backend code and joins array messages", async () => {
    const response = new Response(JSON.stringify({
      code: "PIN_LOCKED",
      message: ["Too many attempts.", "Try again later."],
    }), {
      status: 400,
      headers: { "Retry-After": "90" },
    });

    const error = await ApiError.fromResponse(response, "Fallback.");

    expect(error).toBeInstanceOf(ApiError);
    expect(error.name).toBe("ApiError");
    expect(error.status).toBe(400);
    expect(error.code).toBe("PIN_LOCKED");
    expect(error.message).toBe("Too many attempts. Try again later.");
    expect(error.retryAfter).toBe(90);
  });

  test("uses the fallback and omits the code when the body is not JSON", async () => {
    const response = new Response("not json", { status: 502 });

    const error = await ApiError.fromResponse(response, "Something went wrong.");

    expect(error.status).toBe(502);
    expect(error.code).toBeUndefined();
    expect(error.message).toBe("Something went wrong.");
    expect(error.retryAfter).toBeUndefined();
  });
});

test("ApiError.network describes a failed fetch with status zero", () => {
  const error = ApiError.network();

  expect(error.status).toBe(0);
  expect(error.code).toBe("NETWORK");
  expect(error.message).toBe("Unable to reach the server. Please try again.");
});
