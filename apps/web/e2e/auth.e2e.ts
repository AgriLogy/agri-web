import { expect, signIn, test } from './fixtures';

/** Phase 2 — accounts: a protected page needs a valid session. */
test.describe('session', () => {
  test('no token: a protected page sends you to login', async ({ page }) => {
    await page.goto('/water');
    await expect(page).toHaveURL(/\/login/);
  });

  test('forged token: rejected, back to login', async ({ page, seed }) => {
    await signIn(page, {
      ...seed.users.a,
      access: `${seed.users.a.access.slice(0, -4)}AAAA`,
      refresh: 'not-a-refresh-token',
    });
    await page.goto('/water');
    await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
  });

  test('valid token: stays on the page and shows the user', async ({
    page,
    seed,
  }) => {
    await signIn(page, seed.users.a);
    await page.goto('/water');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/water$/);
    await expect(page.getByText(seed.users.a.username).first()).toBeVisible();
  });
});
