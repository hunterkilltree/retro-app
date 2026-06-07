import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config for the Retro app.
 *
 * These are FULL-STACK tests: they drive the real Next.js frontend, which
 * proxies to the real Spring Boot backend + Postgres. Bring the stack up first
 * (see e2e/README.md). The Next dev server is started automatically below if it
 * isn't already running; the backend and database must be running separately.
 */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

export default defineConfig({
  testDir: "./e2e",
  // A full retro flow has several WebSocket round-trips, so give tests headroom.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: BASE_URL,
    actionTimeout: 10_000,
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],

  // Auto-start the Next.js frontend if it isn't already up. Reuses an existing
  // server (e.g. when you run the full docker compose stack on :3000).
  // NOTE: the Spring backend + Postgres are NOT started here — see e2e/README.md.
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    env: { BACKEND_URL },
  },
});
