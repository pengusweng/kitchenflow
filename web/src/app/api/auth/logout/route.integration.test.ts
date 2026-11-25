// @vitest-environment jsdom
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { server } from "@/tests/mocks/server";

const { cookieStore } = vi.hoisted(() => ({
  cookieStore: { get: vi.fn(), delete: vi.fn() },
}));

vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));

import { POST } from "./route";

const API_URL = "http://api.test";

beforeEach(() => {
  cookieStore.get.mockReset();
  cookieStore.delete.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/auth/logout", () => {
  test("revokes the upstream session with the bearer token and always clears the cookie", async () => {
    vi.stubEnv("API_URL", API_URL);
    cookieStore.get.mockReturnValue({ name: "kkfc_session", value: "fixture-token" });
    let authorization: string | null = null;
    server.use(http.post(`${API_URL}/api/auth/logout`, ({ request }) => {
      authorization = request.headers.get("authorization");
      return new HttpResponse(null, { status: 204 });
    }));

    const response = await POST();

    expect(response.status).toBe(204);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(authorization).toBe("Bearer fixture-token");
    expect(cookieStore.delete).toHaveBeenCalledWith("kkfc_session");
  });

  test("still clears the cookie when the upstream revocation fails", async () => {
    vi.stubEnv("API_URL", API_URL);
    cookieStore.get.mockReturnValue({ name: "kkfc_session", value: "fixture-token" });
    server.use(http.post(`${API_URL}/api/auth/logout`, () => HttpResponse.error()));

    const response = await POST();

    expect(response.status).toBe(204);
    expect(cookieStore.delete).toHaveBeenCalledWith("kkfc_session");
  });

  test("does not call the API when there is no session cookie", async () => {
    vi.stubEnv("API_URL", API_URL);
    cookieStore.get.mockReturnValue(undefined);
    let called = false;
    server.use(http.post(`${API_URL}/api/auth/logout`, () => {
      called = true;
      return new HttpResponse(null, { status: 204 });
    }));

    const response = await POST();

    expect(response.status).toBe(204);
    expect(called).toBe(false);
    expect(cookieStore.delete).toHaveBeenCalledWith("kkfc_session");
  });
});
