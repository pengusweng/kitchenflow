import { defineConfig, devices } from "@playwright/test";

// Next.js uses localhost as the origin for the local production server.
const appURL = "http://localhost:3001";
const fixtureURL = "http://127.0.0.1:3101";
const browserChannel = process.env.PLAYWRIGHT_CHANNEL;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["junit", { outputFile: "reports/playwright.xml" }],
  ],
  use: {
    baseURL: appURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: browserChannel } }],
  webServer: [
    {
      command: "node tests/fixtures/auth-api.mjs",
      url: `${fixtureURL}/health`,
    },
    {
      command: "node node_modules/next/dist/bin/next start --hostname localhost --port 3001",
      env: { API_URL: fixtureURL },
      url: `${appURL}/login`,
      timeout: 120_000,
    },
  ],
});
