import { defineConfig, devices, type PlaywrightTestConfig } from "@playwright/test";

/**
 * Playwright E2E config for the Retro app.
 *
 * These are FULL-STACK tests: they drive the real Next.js frontend, which
 * proxies to the real Spring Boot backend + Postgres.
 *
 * Target selection via PLAYWRIGHT_BASE_URL:
 *   • Local (default http://localhost:3000) — Playwright auto-starts the Next
 *     dev server (the backend + Postgres must be running separately).
 *   • Remote (e.g. the production URL) — no dev server is started; tests run
 *     against the deployed app as-is.
 *
 * Run against production:
 *   PLAYWRIGHT_BASE_URL=https://retro-frontend.onrender.com npm run test:e2e
 *
 * See e2e/README.md for details and caveats.
 */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";
const IS_LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(BASE_URL);

const config: PlaywrightTestConfig = {
  testDir: "./e2e",
  // A full retro flow has several WebSocket round-trips. Remote targets (esp.
  // free-tier hosts that cold-start) need more headroom than local.
  timeout: IS_LOCAL ? 60_000 : 120_000,
  expect: { timeout: IS_LOCAL ? 10_000 : 30_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: BASE_URL,
    actionTimeout: IS_LOCAL ? 10_000 : 30_000,
    // Ignore self-signed/staging certs if you point at an internal env over https.
    ignoreHTTPSErrors: !IS_LOCAL,
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
};

// Only manage a local dev server when targeting localhost. Against a deployed
// (remote) URL we run the app exactly as hosted — no server is started.
if (IS_LOCAL) {
  config.webServer = {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    env: { BACKEND_URL },
  };
}

export default defineConfig(config);
