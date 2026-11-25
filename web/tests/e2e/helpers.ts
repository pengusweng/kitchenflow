import type { Page } from "@playwright/test";

export const FIXTURE_USERNAME = "qa-supervisor";
export const FIXTURE_PASSWORD = "qa-password";

export async function signIn(page: Page, password = FIXTURE_PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(FIXTURE_USERNAME);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
}
