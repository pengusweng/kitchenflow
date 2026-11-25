// @vitest-environment jsdom
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, test, vi } from "vitest";
import { server } from "@/tests/mocks/server";
import { POST } from "./route";

const API_URL = "http://api.test";
const session = {
  token: "fixture-token",
  expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  user: {
    user_id: "b6acd2dc-24bd-4b91-8d13-b2f2db76ed16",
    username: "qa-supervisor",
    first_name: "QA",
    last_name: "Supervisor",
    role: "SUPERVISOR",
    is_active: true,
    created_at: "2025-01-01T00:00:00.000Z",
    modified_at: "2025-01-01T00:00:00.000Z",
  },
};

function loginRequest(body: unknown = { username: "qa-supervisor", password: "qa-password" }, headers?: HeadersInit) {
  return new Request("http://localhost:3001/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/auth/login", () => {
  test("rejects invalid JSON with field messages before contacting the API", async () => {
    vi.stubEnv("API_URL", API_URL);
    let called = false;
    server.use(http.post(`${API_URL}/api/auth/login`, () => {
      called = true;
      return HttpResponse.json(session);
    }));

    const response = await POST(loginRequest("not json"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: expect.any(Array) });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(called).toBe(false);
  });

  test("returns 503 when the API URL is not configured", async () => {
    vi.stubEnv("API_URL", undefined);

    const response = await POST(loginRequest());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ message: "Login is unavailable." });
  });

  test("turns an upstream 401 into the generic credential message", async () => {
    vi.stubEnv("API_URL", API_URL);
    server.use(http.post(`${API_URL}/api/auth/login`, () =>
      HttpResponse.json({ code: "SOME_SECRET_CODE", message: "Invalid credentials" }, { status: 401 }),
    ));

    const response = await POST(loginRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ message: "Invalid username or password." });
  });

  test("forwards PIN codes so the form can switch to the PIN step", async () => {
    vi.stubEnv("API_URL", API_URL);
    server.use(http.post(`${API_URL}/api/auth/login`, ({ request }) =>
      request.headers.get("x-action-pin") === "1234"
        ? HttpResponse.json({ code: "INVALID_PIN", message: "Invalid PIN" }, { status: 401 })
        : HttpResponse.json({ code: "PIN_REQUIRED", message: "PIN required" }, { status: 403 }),
    ));

    const required = await POST(loginRequest());
    const invalid = await POST(loginRequest(undefined, { "x-action-pin": "1234" }));

    expect(required.status).toBe(403);
    await expect(required.json()).resolves.toEqual({ code: "PIN_REQUIRED", message: "PIN required" });
    expect(invalid.status).toBe(401);
    await expect(invalid.json()).resolves.toEqual({ code: "INVALID_PIN", message: "Invalid PIN" });
  });

  test("sets a no-store, HTTP-only session cookie for a valid response", async () => {
    vi.stubEnv("API_URL", API_URL);
    let sentBody: unknown;
    server.use(http.post(`${API_URL}/api/auth/login`, async ({ request }) => {
      sentBody = await request.json();
      return HttpResponse.json(session);
    }));

    const response = await POST(loginRequest());
    const cookie = response.cookies.get("kkfc_session");

    expect(response.status).toBe(200);
    expect(sentBody).toEqual({ username: "qa-supervisor", password: "qa-password" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(cookie).toMatchObject({
      name: "kkfc_session",
      value: session.token,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    expect(new Date(cookie!.expires!).getTime()).toBeGreaterThan(Date.now());
  });

  test("reports a network failure as 502", async () => {
    vi.stubEnv("API_URL", API_URL);
    server.use(http.post(`${API_URL}/api/auth/login`, () => HttpResponse.error()));

    const response = await POST(loginRequest());

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ message: "Unable to reach the server." });
  });
});
