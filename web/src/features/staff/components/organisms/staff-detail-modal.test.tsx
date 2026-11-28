// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import PinProvider from "@/src/features/pin/containers/pin-provider";
import type { UserRole } from "../../schemas/userSchema";
import { ROLE_LABEL, type StaffMember } from "../../utils/staff";
import StaffDetailModal from "./staff-detail-modal";

function memberWithRole(roleCode: UserRole): StaffMember {
  return {
    id: "b6acd2dc-24bd-4b91-8d13-b2f2db76ed16",
    name: "Maria Santos",
    firstName: "Maria",
    lastName: "Santos",
    username: "maria",
    role: ROLE_LABEL[roleCode],
    roleCode,
    status: "active",
    createdAt: "Jan 1, 2025, 8:00 AM",
    modifiedAt: "Jan 1, 2025, 8:00 AM",
  };
}

function renderProfile(roleCode: UserRole) {
  render(
    <PinProvider>
      <StaffDetailModal member={memberWithRole(roleCode)} open onOpenChange={vi.fn()} />
    </PinProvider>,
  );
}

test("offers Reset PIN on a superadmin's profile", async () => {
  renderProfile("SUPERADMIN");

  expect(await screen.findByRole("button", { name: "Reset PIN" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
});

test.each([
  "RECIPE_MANAGER",
  "SUPERVISOR",
  "KITCHEN_HEAD",
  "INVENTORY_STAFF",
  "KITCHEN_STAFF",
  "CASHIER_STAFF",
] as const)("hides Reset PIN on a %s profile, which has no PIN", async (role) => {
  renderProfile(role);

  expect(await screen.findByRole("button", { name: "Edit" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Reset PIN" })).not.toBeInTheDocument();
});
