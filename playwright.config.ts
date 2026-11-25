import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

/** Must match BETTER_AUTH_URL's port (auth checks the origin). */
const PORT = 3000;
/** Second server without payment keys (graceful-failure test). */
const NOPAY_PORT = 3001;
/** E2E runs the store with a throwaway admin, never the real ADMIN_EMAIL. */
export const E2E_ADMIN = process.env.E2E_ADMIN_EMAIL ?? "admin-e2e@example.com";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
    screenshot: "only-on-failure",
    // Cloud sandboxes ship a pinned Chromium here; locally Playwright uses its own browsers.
    ...(existsSync("/opt/pw-browsers/chromium") ? { launchOptions: { executablePath: "/opt/pw-browsers/chromium" } } : {}),
  },
  // Mobile first, then desktop.
  projects: [
    { name: "mobile", use: { ...devices["iPhone 13"], browserName: "chromium" } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: [
    {
      command: `npm run start -- -p ${PORT}`,
      port: PORT,
      reuseExistingServer: true,
      timeout: 120_000,
      env: { ADMIN_EMAIL: E2E_ADMIN },
    },
    {
      command: `npm run start -- -p ${NOPAY_PORT}`,
      port: NOPAY_PORT,
      reuseExistingServer: true,
      timeout: 120_000,
      env: { PAYSTACK_SECRET_KEY: "", ADMIN_EMAIL: E2E_ADMIN },
    },
  ],
});
