import { expect, signIn, test, watchProblems } from './fixtures';

/**
 * Phase 2 smoke: every farmer page opens for a farmer with data and for a
 * read-only technician, without an uncaught exception, without a 5xx from the
 * API, and without bouncing to the login page.
 */
const PAGES = [
  '/',
  '/farm',
  '/soil',
  '/station',
  '/plant',
  '/water',
  '/crop-calendar',
  '/vannes-pompes',
  '/notifications',
  '/notification-zones',
  '/alerts',
  '/reports',
  '/settings',
  '/chat',
  '/data',
];

for (const role of ['a', 'tech'] as const) {
  test.describe(`pages as ${role === 'a' ? 'farmer' : 'technician'}`, () => {
    for (const path of PAGES) {
      test(`${path} opens cleanly`, async ({ page, seed }) => {
        await signIn(page, seed.users[role], role === 'tech');
        const problems = watchProblems(page);
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        expect(new URL(page.url()).pathname, 'bounced to login').not.toBe(
          '/login'
        );
        await expect(page.locator('body')).not.toContainText(
          /Application error|Unhandled Runtime Error|This page could not be found/
        );
        expect(problems.pageErrors, 'uncaught page errors').toEqual([]);
        expect(problems.serverErrors, 'API 5xx responses').toEqual([]);
      });
    }
  });
}
