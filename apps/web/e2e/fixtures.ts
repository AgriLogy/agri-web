import {
  test as base,
  expect,
  request,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import { API_URL, loadSeed, type Seed, type SeedUser } from './seed';

export type Problems = {
  pageErrors: string[];
  serverErrors: string[];
};

/** Sign in by token, like the app does after /auth/sessions. */
export async function signIn(page: Page, user: SeedUser, technician = false) {
  await page.addInitScript(
    ([access, refresh, tech]) => {
      window.localStorage.setItem('accessToken', access);
      window.localStorage.setItem('refreshToken', refresh);
      window.localStorage.setItem('isTechnician', tech);
    },
    [user.access, user.refresh, technician ? '1' : '0']
  );
}

/** Record uncaught page errors and 5xx API responses while a page is used. */
export function watchProblems(page: Page): Problems {
  const problems: Problems = { pageErrors: [], serverErrors: [] };
  page.on('pageerror', (err) => problems.pageErrors.push(err.message));
  page.on('response', (res) => {
    if (res.status() >= 500)
      problems.serverErrors.push(
        `${res.status()} ${res.request().method()} ${res.url()}`
      );
  });
  return problems;
}

export async function apiAs(user: SeedUser): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${user.access}` },
  });
}

export const test = base.extend<{ seed: Seed }>({
  // `provide`, not `use`: the React hooks lint rule would misread it.
  seed: async ({}, provide) => {
    await provide(loadSeed());
  },
});

export { expect };
