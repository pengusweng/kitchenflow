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
