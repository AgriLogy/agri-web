import path from 'node:path';
import { defineConfig } from '@playwright/test';

/**
 * Screenshot tour (recette fonctionnelle): walks every screen as a farmer, a
 * technician, in Arabic and on a phone, screenshots each step and evaluates
 * it automatically. Not part of CI — it needs the local stack:
 *   web  E2E_BASE_URL (default http://localhost:3000, `npm run dev`)
 *   API  E2E_API_URL  (default http://localhost:8080)
 *
 *   npm run test:tour -w apps/web
 *   npm run tour:report -w apps/web -- tour-output/<run>
 *
 * Output: tour-output/<timestamp>/{shots/*.png, manifest.json}.
 */
const stamp = new Date()
  .toISOString()
  .replace(/\.\d+Z$/, '')
  .replace(/[:T]/g, '-');
// Set once in the runner process; workers inherit it.
process.env.TOUR_RUN_DIR ??= path.join(__dirname, 'tour-output', stamp);

export default defineConfig({
  testDir: './e2e/tour',
  testMatch: /.*\.tour\.ts/,
  globalSetup: './e2e/tour/global-setup.ts',
  globalTeardown: './e2e/tour/global-teardown.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 150_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  outputDir: path.join(process.env.TOUR_RUN_DIR, '.playwright'),
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    channel: 'chrome',
    timezoneId: 'Africa/Casablanca',
    headless: true,
    // A stuck click must fail the step, not hang the whole tour.
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
    screenshot: 'off',
    trace: 'off',
  },
});
