import { expect, test } from "vitest";
import { navGroupsFor } from "./navItems";

test.each([
  ["SUPERADMIN", ["Brands", "Modifiers", "Staff Accounts"]],
  ["RECIPE_MANAGER", ["Modifiers"]],
  ["SUPERVISOR", []],
] as const)("shows the expected management links for %s", (role, expected) => {
  const labels = navGroupsFor(role).flatMap((group) => group.items.map((item) => item.label));
  const managementLinks = labels.filter((label) => ["Brands", "Modifiers", "Staff Accounts"].includes(label));

  expect(labels).toContain("Workspace");
  expect(managementLinks.sort()).toEqual(expected);
});

test("keeps the operations links in order and drops empty groups for a supervisor", () => {
  const groups = navGroupsFor("SUPERVISOR");

  expect(groups.map((group) => group.label ?? "Workspace")).toEqual(["Workspace", "Operations", "Administration"]);
  expect(groups[0].items.map(({ label, href }) => [label, href])).toEqual([
    ["Workspace", "/dashboard"],
  ]);
  expect(groups[1].items.map(({ label, href }) => [label, href])).toEqual([
    ["Orders", "/dashboard/orders"],
    ["Menu & Availability", "/dashboard/menu"],
    ["Kitchen Overview", "/dashboard/kitchen-overview"],
  ]);
  expect(groups[2].items.map(({ label, href }) => [label, href])).toEqual([
    ["Recipes", "/dashboard/recipes"],
    ["Audit History", "/dashboard/audit-history"],
  ]);
});

test("hides every role-gated link for an unknown role", () => {
  const labels = navGroupsFor("UNKNOWN").flatMap((group) => group.items.map((item) => item.label));

  expect(labels).toEqual([
    "Workspace",
    "Orders",
    "Menu & Availability",
    "Kitchen Overview",
    "Recipes",
    "Audit History",
  ]);
});
