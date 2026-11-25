// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { expect, test, vi } from "vitest";
import { server } from "@/tests/mocks/server";
import { useLogin } from "../hooks/useLogin";
import LoginCard from "./login-card";

function renderLoginForm() {
  const onSuccess = vi.fn();
  function LoginForm() {
    // Pass the whole hook result, as the login page does, so the PIN step props stay in sync.
    return <LoginCard {...useLogin(onSuccess)} />;
  }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const user = userEvent.setup();
  render(<QueryClientProvider client={client}><LoginForm /></QueryClientProvider>);
  return { user, onSuccess };
}

test("shows the API's invalid-credentials error without navigating", async () => {
  server.use(http.post("*/api/auth/login", () =>
    HttpResponse.json({ message: "Invalid credentials" }, { status: 401 }),
  ));
  const { user, onSuccess } = renderLoginForm();

  await user.type(screen.getByLabelText("Username"), "manager");
  await user.type(screen.getByLabelText("Password", { exact: true }), "wrong-password");
  await user.click(screen.getByRole("button", { name: "Sign In" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Invalid username or password.");
  expect(onSuccess).not.toHaveBeenCalled();
});

test("keeps the superadmin on the PIN step after an incorrect PIN", async () => {
  server.use(http.post("*/api/auth/login", ({ request }) => {
    if (request.headers.get("x-action-pin") === "1234") {
      return HttpResponse.json({ code: "INVALID_PIN", message: "Invalid PIN" }, { status: 401 });
    }
    return HttpResponse.json({ code: "PIN_REQUIRED", message: "PIN required" }, { status: 403 });
  }));
  const { user, onSuccess } = renderLoginForm();

  await user.type(screen.getByLabelText("Username"), "admin");
  await user.type(screen.getByLabelText("Password", { exact: true }), "qa-password");
  await user.click(screen.getByRole("button", { name: "Sign In" }));

  const pin = await screen.findByLabelText("4-digit PIN");
  await user.type(pin, "1234");
  expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect PIN. Try again.");
  expect(pin).toHaveValue("");
  expect(onSuccess).not.toHaveBeenCalled();
});

test("shows client validation errors without calling the API", async () => {
  let called = false;
  server.use(http.post("*/api/auth/login", () => {
    called = true;
    return HttpResponse.json({ message: "Invalid credentials" }, { status: 401 });
  }));
  const { user } = renderLoginForm();

  await user.click(screen.getByRole("button", { name: "Sign In" }));

  expect(await screen.findByText("Username is required.")).toBeInTheDocument();
  expect(screen.getByText("Password must be at least 8 characters.")).toBeInTheDocument();
  expect(called).toBe(false);
});

test("posts trimmed credentials and passes the session to onSuccess", async () => {
  const session = {
    token: "fixture-token",
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    user: {
      user_id: "b6acd2dc-24bd-4b91-8d13-b2f2db76ed16",
      username: "manager",
      first_name: "QA",
      last_name: "Manager",
      role: "SUPERVISOR",
      is_active: true,
      created_at: "2025-01-01T00:00:00.000Z",
      modified_at: "2025-01-01T00:00:00.000Z",
    },
  };
  let sentBody: unknown;
  server.use(http.post("*/api/auth/login", async ({ request }) => {
    sentBody = await request.json();
    return HttpResponse.json(session);
  }));
  const { user, onSuccess } = renderLoginForm();

  await user.type(screen.getByLabelText("Username"), "  manager  ");
  await user.type(screen.getByLabelText("Password", { exact: true }), " qa-password ");
  await user.click(screen.getByRole("button", { name: "Sign In" }));

  await vi.waitFor(() => expect(onSuccess).toHaveBeenCalled());
  expect(onSuccess.mock.calls[0][0]).toEqual(session);
  expect(sentBody).toEqual({ username: "manager", password: " qa-password " });
});
