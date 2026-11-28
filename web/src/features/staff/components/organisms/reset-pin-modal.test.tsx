// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { expect, test, vi } from "vitest";
import { server } from "@/tests/mocks/server";
import PinProvider from "@/src/features/pin/containers/pin-provider";
import type { StaffMember } from "../../utils/staff";
import ResetPinModal from "./reset-pin-modal";

const member: StaffMember = {
  id: "b6acd2dc-24bd-4b91-8d13-b2f2db76ed16",
  name: "Maria Santos",
  firstName: "Maria",
  lastName: "Santos",
  username: "maria",
  role: "Superadmin",
  roleCode: "SUPERADMIN",
  status: "active",
  createdAt: "Jan 1, 2025, 8:00 AM",
  modifiedAt: "Jan 1, 2025, 8:00 AM",
};

function renderModal() {
  const onReset = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={client}>
      <PinProvider>
        <ResetPinModal member={member} open onOpenChange={vi.fn()} onReset={onReset} />
      </PinProvider>
    </QueryClientProvider>,
  );
  return { user, onReset };
}

test("gives the staff member a new PIN after the superadmin confirms with their own PIN", async () => {
  const sent: { pin?: unknown; actionPin?: string | null } = {};
  server.use(
    http.put("*/api/users/:id/pin", async ({ request, params }) => {
      expect(params.id).toBe(member.id);
      sent.pin = await request.json();
      sent.actionPin = request.headers.get("x-action-pin");
      return HttpResponse.json({ user_id: member.id, failed_attempts: 0, locked_until: null });
    }),
  );
  const { user, onReset } = renderModal();

  await user.type(await screen.findByLabelText("New 4-digit PIN"), "0456");
  await user.type(screen.getByLabelText("Confirm 4-digit PIN"), "0465");
  await user.click(screen.getByRole("button", { name: "Reset PIN" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("The PINs don't match.");
  expect(sent.pin).toBeUndefined();

  await user.clear(screen.getByLabelText("Confirm 4-digit PIN"));
  await user.type(screen.getByLabelText("Confirm 4-digit PIN"), "0456");
  await user.click(screen.getByRole("button", { name: "Reset PIN" }));

  expect(await screen.findByRole("heading", { name: "Confirm with your PIN" })).toBeInTheDocument();
  await user.type(screen.getByLabelText("4-digit PIN"), "1234");

  await vi.waitFor(() => expect(onReset).toHaveBeenCalledWith(member));
  expect(sent).toEqual({ pin: { pin: "0456" }, actionPin: "1234" });
});

test("shows the API's refusal and keeps the form open", async () => {
  server.use(
    http.put("*/api/users/:id/pin", () =>
      HttpResponse.json(
        { code: "PIN_NOT_SUPPORTED_FOR_ROLE", message: "Only superadmin accounts have a PIN." },
        { status: 400 },
      ),
    ),
  );
  const { user, onReset } = renderModal();

  await user.type(await screen.findByLabelText("New 4-digit PIN"), "0456");
  await user.type(screen.getByLabelText("Confirm 4-digit PIN"), "0456");
  await user.click(screen.getByRole("button", { name: "Reset PIN" }));
  await user.type(await screen.findByLabelText("4-digit PIN"), "1234");

  expect(await screen.findByText("Only superadmin accounts have a PIN.")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Reset PIN" })).toBeInTheDocument();
  expect(onReset).not.toHaveBeenCalled();
});
