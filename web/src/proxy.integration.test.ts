// @vitest-environment jsdom
import { NextRequest } from "next/server";
import { describe, expect, test } from "vitest";
import { proxy } from "./proxy";

const API_URL = "http://localhost:3001/api/users";

function request(method: string, headers: Record<string, string> = {}) {
  return new NextRequest(API_URL, { method, headers });
}

describe("proxy", () => {
  test("rejects a cross-origin mutation with no authorization header", () => {
    const response = proxy(request("POST", { origin: "http://evil.test" }));

    expect(response.status).toBe(403);
    expect(response.headers.get("Content-Type")).toContain("application/json");
  });

  test("allows same-origin mutations, safe methods and explicit authorization", () => {
    expect(proxy(request("POST", { origin: "http://localhost:3001" })).status).toBe(200);
    expect(proxy(request("GET")).status).toBe(200);
    expect(proxy(request("DELETE", {
      origin: "http://evil.test",
      authorization: "Bearer token",
    })).status).toBe(200);
  });

  test("converts the session cookie into an authorization header for the API", () => {
    const response = proxy(request("GET", { cookie: "kkfc_session=fixture-token" }));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-request-authorization")).toBe("Bearer fixture-token");
  });

  test("does not overwrite an authorization header that is already present", () => {
    const response = proxy(request("GET", {
      cookie: "kkfc_session=fixture-token",
      authorization: "Bearer explicit-token",
    }));

    expect(response.headers.get("x-middleware-request-authorization")).toBe("Bearer explicit-token");
  });
});
