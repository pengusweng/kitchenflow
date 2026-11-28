import { defineConfig, devices } from "@playwright/test";

// Next.js uses localhost as the origin for the local production server.
const appPort = process.env.PLAYWRIGHT_APP_PORT ?? "3001";
const fixturePort = process.env.PLAYWRIGHT_FIXTURE_PORT ?? "3101";
const appURL = `http://localhost:${appPort}`;
const fixtureURL = `http://127.0.0.1:${fixturePort}`;
const browserChannel = process.env.PLAYWRIGHT_CHANNEL;
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_SERVER === "1";

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
      reuseExistingServer,
    },
    {
      command: `node node_modules/next/dist/bin/next start --hostname localhost --port ${appPort}`,
      env: { API_URL: fixtureURL },
      url: `${appURL}/login`,
      reuseExistingServer,
      timeout: 120_000,
    },
  ],
});
