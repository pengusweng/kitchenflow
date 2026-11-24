import { expect, test } from "@playwright/test";

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
