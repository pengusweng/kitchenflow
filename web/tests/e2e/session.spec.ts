import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

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

test("redirects a signed-in visitor from /login unless switching accounts", async ({ page }) => {
  await signIn(page);
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/login");
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/login?switchAccount=1");
  await expect(page).toHaveURL(/\/login\?switchAccount=1$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("treats an unknown session cookie as signed out", async ({ page, context }) => {
  await context.addCookies([{
    name: "kkfc_session",
    value: "stale-token",
    url: "http://localhost:3001",
    httpOnly: true,
    sameSite: "Lax",
  }]);

  await page.goto("/dashboard/staff");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("navigation", { name: "Dashboard" })).toHaveCount(0);
});

test("sets the session cookie with HTTP-only and same-site protections", async ({ page, context }) => {
  await signIn(page);
  await expect(page).toHaveURL(/\/dashboard$/);

  const cookie = (await context.cookies()).find(({ name }) => name === "kkfc_session");

  expect(cookie).toMatchObject({
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
  });
  expect(cookie!.expires!).toBeGreaterThan(Date.now() / 1000);
});

test("redirects signed-out visitors from every server-guarded management page", { tag: "@smoke" }, async ({ page }) => {
  for (const path of ["/dashboard/brands", "/dashboard/modifiers", "/dashboard/menu", "/dashboard/staff"]) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/login$/);
  }
});
