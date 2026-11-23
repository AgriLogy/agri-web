import { expect, signIn, test, watchProblems } from './fixtures';

/** Arabic interface: right-to-left layout and translated strings. */
test.describe('Arabic (RTL)', () => {
  for (const path of ['/', '/water', '/alerts', '/settings']) {
    test(`${path} renders right-to-left`, async ({ page, context, seed }) => {
      await context.addCookies([
        {
          name: 'NEXT_LOCALE',
          value: 'ar',
          url: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
        },
      ]);
      await signIn(page, seed.users.a);
      const problems = watchProblems(page);
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
      if (path === '/water')
        await expect(page.getByText('مصادر المياه').first()).toBeVisible();
      expect(problems.pageErrors).toEqual([]);
    });
  }
});
