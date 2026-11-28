import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page, password = "qa-password") {
  await page.goto("/login");
  await page.getByLabel("Username").fill("qa-supervisor");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
}

test("rejects invalid credentials without creating a session", async ({ page, context }) => {
  await signIn(page, "wrong-password");

  await expect(page.getByRole("region", { name: "Sign in" }).getByRole("alert"))
    .toHaveText("Invalid username or password.");
  await expect(page).toHaveURL(/\/login$/);
  expect((await context.cookies()).some(({ name }) => name === "kkfc_session")).toBe(false);
});

test("keeps the session after reload and clears it on sign-out", async ({ page, context }) => {
  await signIn(page);
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(await context.cookies()).toContainEqual(expect.objectContaining({
    name: "kkfc_session",
    httpOnly: true,
  }));

  await page.reload();
  await expect(page.getByRole("navigation", { name: "Dashboard" })).toBeVisible();
  await page.getByRole("button", { name: "Account menu for QA Supervisor" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await context.cookies()).some(({ name }) => name === "kkfc_session")).toBe(false);
});

test("restricts staff accounts for a signed-in supervisor", async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole("navigation", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Staff Accounts" })).toHaveCount(0);

  await page.goto("/dashboard/staff");
  await expect(page.getByRole("heading", { name: "Only superadmins can manage staff accounts" })).toBeVisible();
});

test("asks a superadmin without a PIN to set one up, confirmed with their password, then signs in", async ({ page, context }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill("qa-newadmin");
  await page.getByLabel("Password", { exact: true }).fill("qa-password");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Set up your PIN" })).toBeVisible();
  expect((await context.cookies()).some(({ name }) => name === "kkfc_session")).toBe(false);

  await page.getByLabel("New 4-digit PIN").fill("0123");
  await page.getByLabel("Confirm 4-digit PIN").fill("0123");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Save PIN and sign in" }).click();
  await expect(page.getByRole("region", { name: "Set up your PIN" }).getByRole("alert"))
    .toContainText("That password isn't right.");
  expect((await context.cookies()).some(({ name }) => name === "kkfc_session")).toBe(false);

  await page.getByLabel("Password", { exact: true }).fill("qa-password");
  await page.getByRole("button", { name: "Save PIN and sign in" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  expect(await context.cookies()).toContainEqual(expect.objectContaining({
    name: "kkfc_session",
    httpOnly: true,
  }));
});
