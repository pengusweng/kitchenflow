import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { server } from "@/tests/mocks/server";
import { POST } from "./route";

const API = "http://api.test";

const session = {
  token: "fixture-token",
  expires_at: new Date(Date.now() + 60 * 60_000).toISOString(),
  user: {
    user_id: "a1111111-1111-4111-8111-111111111101",
    username: "admin",
    first_name: "King",
    last_name: "Owner",
    role: "SUPERADMIN",
    is_active: true,
    created_at: "2025-01-01T00:00:00.000Z",
    modified_at: "2025-01-01T00:00:00.000Z",
  },
};

const input = { username: "admin", password: "qa-password", pin: "0123" };

function post(body: unknown) {
  return POST(
    new Request("http://web.test/api/auth/pin-setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => vi.stubEnv("API_URL", API));
afterEach(() => vi.unstubAllEnvs());

test("forwards the setup and sets the httpOnly session cookie", async () => {
  let forwarded: unknown;
  server.use(
    http.post(`${API}/api/auth/pin-setup`, async ({ request }) => {
      forwarded = await request.json();
      return HttpResponse.json(session);
    }),
  );

  const response = await post(input);

  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(forwarded).toEqual(input);
  expect(await response.json()).toEqual(session);
  const cookie = response.headers.get("set-cookie") ?? "";
  expect(cookie).toContain("kkfc_session=fixture-token");
  expect(cookie.toLowerCase()).toContain("httponly");
});

test.each([
  { ...input, pin: "12" },
  { ...input, pin: 123 },
  { ...input, password: "short" },
  { username: "admin", pin: "0123" },
])("rejects invalid input without calling the API: %j", async (body) => {
  const upstream = vi.fn();
  server.use(http.post(`${API}/api/auth/pin-setup`, upstream));

  const response = await post(body);

  expect(response.status).toBe(400);
  expect(upstream).not.toHaveBeenCalled();
  expect(response.headers.get("set-cookie")).toBeNull();
});

test.each([
  [401, { code: "INVALID_CREDENTIALS", message: "Invalid username or password." }],
  [403, { code: "PIN_SETUP_NOT_ALLOWED", message: "Only superadmins set up their PIN while signing in." }],
  [409, { code: "EXISTING_PIN_FOUND", message: "User already has existing pin" }],
])("passes the API's %i refusal through for the setup step", async (status, body) => {
  server.use(http.post(`${API}/api/auth/pin-setup`, () => HttpResponse.json(body, { status })));

  const response = await post(input);

  expect(response.status).toBe(status);
  expect(await response.json()).toEqual(body);
  expect(response.headers.get("set-cookie")).toBeNull();
});

test("hides other API failures behind a generic 502", async () => {
  server.use(
    http.post(`${API}/api/auth/pin-setup`, () =>
      HttpResponse.json({ message: "database stack trace" }, { status: 500 }),
    ),
  );

  const response = await post(input);

  expect(response.status).toBe(502);
  expect(JSON.stringify(await response.json())).not.toContain("stack trace");
});
