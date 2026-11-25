import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("opens the login form from home and toggles password visibility", { tag: "@smoke" }, async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();

  const password = page.getByLabel("Password", { exact: true });
  await password.fill("example-password");
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(password).toHaveAttribute("type", "password");
  await expect(password).toHaveValue("example-password");
});

test("redirects signed-out visitors from staff accounts to login", { tag: "@smoke" }, async ({ page }) => {
  await page.goto("/dashboard/staff");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("rejects empty credentials locally before making a request", { tag: "@smoke" }, async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/auth/login")) requests.push(request.url());
  });

  await page.goto("/login");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();

  await expect(page.getByText("Username is required.")).toBeVisible();
  await expect(page.getByText("Password must be at least 8 characters.")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  expect(requests).toEqual([]);
});

test("shows only role-appropriate dashboard links after sign-in", async ({ page }) => {
  await signIn(page);
  await expect(page).toHaveURL(/\/dashboard$/);

  const nav = page.getByRole("navigation", { name: "Dashboard" });
  await expect(nav.getByRole("link", { name: "Orders" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Menu & Availability" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Kitchen Overview" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Recipes" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Audit History" })).toBeVisible();

  await expect(nav.getByRole("link", { name: "Brands" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Modifiers" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Staff Accounts" })).toHaveCount(0);
});
