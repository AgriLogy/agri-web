import { defineConfig } from '@playwright/test';

/**
 * End-to-end QA suite (agrilogy-front#262) — runs against a LOCAL stack:
 *   web  E2E_BASE_URL (default http://localhost:3000, `npm run dev`)
 *   API  E2E_API_URL  (default http://localhost:8080, the agri-api gateway)
 * Global setup seeds run-unique tenants through E2E_SEED_CMD (default: the
 * local agri-api-web container) and teardown removes them. Not part of CI:
 * it needs the backend, the database and the seed script.
 *
 *   npm run test:e2e -w apps/web
 *
 * Uses the installed Google Chrome (channel "chrome"); no browser download.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.e2e\.ts/,
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]],
  outputDir: 'e2e-results',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    channel: 'chrome',
    // The farmers' timezone. Set E2E_TZ=UTC to run the browser in a different
    // zone than a Morocco-time dev server (surfaces SSR/client date drift).
    timezoneId: process.env.E2E_TZ ?? 'Africa/Casablanca',
    headless: true,
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
