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

// Signs in as a superadmin whose account has no PIN yet, landing on the setup step.
async function reachPinSetup(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Username"), "admin");
  await user.type(screen.getByLabelText("Password", { exact: true }), "qa-password");
  await user.click(screen.getByRole("button", { name: "Sign In" }));
  return screen.findByRole("heading", { name: "Set up your PIN" });
}

const setupRequired = http.post("*/api/auth/login", () =>
  HttpResponse.json({ code: "PIN_SETUP_REQUIRED", message: "Set up your PIN" }, { status: 403 }),
);

const session = {
  token: "token",
  expires_at: new Date(Date.now() + 60_000).toISOString(),
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

test("sets up a superadmin's first PIN, confirmed with their password, and signs in", async () => {
  let sent: unknown;
  server.use(
    setupRequired,
    http.post("*/api/auth/pin-setup", async ({ request }) => {
      sent = await request.json();
      return HttpResponse.json(session);
    }),
  );
  const { user, onSuccess } = renderLoginForm();

  await reachPinSetup(user);
  await user.type(screen.getByLabelText("New 4-digit PIN"), "0123");
  await user.type(screen.getByLabelText("Confirm 4-digit PIN"), "0124");
  await user.click(screen.getByRole("button", { name: "Save PIN and sign in" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("The PINs don't match.");
  expect(sent).toBeUndefined();

  await user.clear(screen.getByLabelText("Confirm 4-digit PIN"));
  await user.type(screen.getByLabelText("Confirm 4-digit PIN"), "0123");
  await user.click(screen.getByRole("button", { name: "Save PIN and sign in" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Enter your password to confirm it's you.");
  expect(sent).toBeUndefined();

  await user.type(screen.getByLabelText("Password", { exact: true }), "qa-password");
  await user.click(screen.getByRole("button", { name: "Save PIN and sign in" }));

  await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  expect(sent).toEqual({ username: "admin", password: "qa-password", pin: "0123" });
});

test("keeps the superadmin on PIN setup after a wrong confirmation password", async () => {
  server.use(
    setupRequired,
    http.post("*/api/auth/pin-setup", () =>
      HttpResponse.json({ code: "INVALID_CREDENTIALS", message: "Invalid username or password." }, { status: 401 }),
    ),
  );
  const { user, onSuccess } = renderLoginForm();

  await reachPinSetup(user);
  await user.type(screen.getByLabelText("New 4-digit PIN"), "0123");
  await user.type(screen.getByLabelText("Confirm 4-digit PIN"), "0123");
  await user.type(screen.getByLabelText("Password", { exact: true }), "not-my-password");
  await user.click(screen.getByRole("button", { name: "Save PIN and sign in" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("That password isn't right.");
  expect(screen.getByRole("heading", { name: "Set up your PIN" })).toBeInTheDocument();
  expect(screen.getByLabelText("Password", { exact: true })).toHaveValue("");
  expect(onSuccess).not.toHaveBeenCalled();
});

test("moves to the PIN step when the account already has a PIN by the time it is saved", async () => {
  server.use(
    setupRequired,
    http.post("*/api/auth/pin-setup", () =>
      HttpResponse.json({ code: "EXISTING_PIN_FOUND", message: "User already has existing pin" }, { status: 409 }),
    ),
  );
  const { user, onSuccess } = renderLoginForm();

  await reachPinSetup(user);
  await user.type(screen.getByLabelText("New 4-digit PIN"), "0123");
  await user.type(screen.getByLabelText("Confirm 4-digit PIN"), "0123");
  await user.type(screen.getByLabelText("Password", { exact: true }), "qa-password");
  await user.click(screen.getByRole("button", { name: "Save PIN and sign in" }));

  expect(await screen.findByRole("heading", { name: "Enter your PIN" })).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent("This account already has a PIN. Enter it to sign in.");
  expect(onSuccess).not.toHaveBeenCalled();
});

