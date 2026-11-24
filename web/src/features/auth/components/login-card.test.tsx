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
