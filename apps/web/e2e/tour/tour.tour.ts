/**
 * Screenshot tour runner: one Playwright test per step of steps.ts. Each step
 * gets a fresh browser context (role, locale, viewport), is screenshotted
 * full-page, and evaluated (evaluate.ts). Results land in
 * `tour-output/<run>/manifest.json` for scripts/tour-report.mjs.
 *
 * A step never fails the Playwright test because the app misbehaves — that is
 * what the report is for. The test fails only if the harness itself breaks.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { request, test, type Page } from '@playwright/test';
import { API_URL, loadSeed, type Seed } from '../seed';
import {
  evaluateStep,
  worst,
  type Check,
  type ExpectResult,
  type NetworkRecord,
  type PageSnapshot,
  type Status,
} from './evaluate';
import { I18N_NAMESPACES, isMessageKey, msg, type TourCtx } from './helpers';
import { STEPS, VIEWPORTS, type ExpectSpec, type TourStep } from './steps';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const RUN_DIR = process.env.TOUR_RUN_DIR!;
const SHOTS = path.join(RUN_DIR, 'shots');
const FIXTURES = path.join(__dirname, 'fixtures');

/** Keep tokens (Mapbox, JWT) out of the manifest and the PDF. */
const redact = (s: string) =>
  s.replace(/(access_token|token)=[^&\s"']+/gi, '$1=…');

/** Known app-wide console noise (listed once in the report's notes). */
const KNOWN_CONSOLE_NOISE = [
  /\[antd: App\] When using cssVar, ensure `component` is assigned/,
];

interface StepResult {
  n: number;
  id: string;
  section: string;
  title: string;
  role: string;
  locale: string;
  viewport: string;
  theme: string;
  path: string;
  caption: string;
  howToTest: string[];
  screenshot: string | null;
  status: Status;
  checks: Check[];
  timings: { loadMs: number; totalMs: number };
}

const results: StepResult[] = [];
const startedAt = new Date();

const git = (cmd: string) => {
  try {
    return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
};

function writeManifest(seed: Seed | null) {
  const counts = { pass: 0, warn: 0, fail: 0 };
  for (const r of results) counts[r.status] += 1;
  const manifest = {
    title: 'Agrogo — Recette fonctionnelle',
    run: {
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      timezone: 'Africa/Casablanca',
      web: {
        branch: git('rev-parse --abbrev-ref HEAD'),
        sha: git('rev-parse HEAD'),
        describe: git('describe --tags --always --dirty'),
      },
      baseUrl: BASE_URL,
      apiUrl: API_URL,
      seedRun: seed?.run ?? null,
      users: seed
        ? {
            farmer: seed.users.a.username,
            technician: seed.users.tech.username,
          }
        : null,
    },
    counts,
    notes: [
      'Bruit console connu, ignoré à chaque étape : avertissement antd « [antd: App] When using cssVar… » (build de développement).',
    ],
    steps: [...results].sort((a, b) => a.n - b.n),
  };
  writeFileSync(
    path.join(RUN_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
}

async function snapshot(page: Page): Promise<PageSnapshot> {
  return page.evaluate(() => {
    const main = document.querySelector('main') ?? document.body;
    return {
      text: document.body.innerText,
      mainTextLength: (main as HTMLElement).innerText.trim().length,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      brokenImages: [...document.images]
        .filter((i) => i.complete && i.currentSrc && i.naturalWidth === 0)
        .map((i) => i.currentSrc),
      htmlDir: document.documentElement.getAttribute('dir'),
      htmlLang: document.documentElement.getAttribute('lang'),
      pathname: location.pathname,
    };
  });
}

async function checkExpect(
  page: Page,
  step: TourStep,
  spec: ExpectSpec
): Promise<ExpectResult> {
  let label: string;
  let loc;
  if (spec.button) {
    const name = msg(step.locale, spec.button);
    label = `bouton « ${name} »`;
    loc = page.getByRole('button', { name, exact: true });
  } else if (spec.key) {
    const text = msg(step.locale, spec.key);
    label = `« ${text} »`;
    loc = page.getByText(text, { exact: false });
  } else if (spec.text) {
    label = `« ${String(spec.text)} »`;
    loc = page.getByText(spec.text);
  } else {
    label = `élément ${spec.selector}`;
    loc = page.locator(spec.selector!);
  }
  const visible = loc.locator('visible=true').first();
  if (spec.absent) {
    const count = await loc.locator('visible=true').count();
    return {
      label: `${label} absent`,
      ok: count === 0,
      detail: count ? 'visible' : undefined,
    };
  }
  try {
    await visible.waitFor({ state: 'visible', timeout: 10_000 });
    return { label, ok: true };
  } catch {
    return { label, ok: false, detail: 'introuvable' };
  }
}

// Steps are independent (fresh context each), so one broken step never
// blocks the rest.
test.describe('screenshot tour', () => {
  let seed: Seed;
  test.beforeAll(() => {
    seed = loadSeed();
    mkdirSync(SHOTS, { recursive: true });
  });
  test.afterAll(() => writeManifest(seed ?? null));

  STEPS.forEach((step, i) => {
    const n = i + 1;
    const nn = String(n).padStart(2, '0');
    test(`${nn} ${step.id}`, async ({ browser }) => {
      test.setTimeout(150_000);
      const t0 = Date.now();
      const vp = VIEWPORTS[step.viewport];
      const mobile = step.viewport === 'mobile';
      const context = await browser.newContext({
        viewport: vp,
        isMobile: mobile,
        hasTouch: mobile,
        deviceScaleFactor: mobile ? 2 : 1,
        locale:
          step.locale === 'ar'
            ? 'ar-MA'
            : step.locale === 'en'
              ? 'en-GB'
              : 'fr-FR',
        colorScheme: step.theme === 'dark' ? 'dark' : 'light',
      });
      // Chakra keeps the colour mode in localStorage; pin it per step.
      await context.addInitScript((mode) => {
        window.localStorage.setItem('chakra-ui-color-mode', mode);
      }, step.theme ?? 'light');
      await context.addCookies([
        { name: 'NEXT_LOCALE', value: step.locale, url: BASE_URL },
      ]);
      const user =
        step.role === 'farmer'
          ? seed.users.a
          : step.role === 'technician'
            ? seed.users.tech
            : null;
      if (user) {
        await context.addInitScript(
          ([access, refresh, tech]) => {
            window.localStorage.setItem('accessToken', access);
            window.localStorage.setItem('refreshToken', refresh);
            window.localStorage.setItem('isTechnician', tech);
          },
          [user.access, user.refresh, step.role === 'technician' ? '1' : '0']
        );
      }
      const api = user
        ? await request.newContext({
            baseURL: API_URL,
            extraHTTPHeaders: { Authorization: `Bearer ${user.access}` },
          })
        : null;
      const page = await context.newPage();

      const pageErrors: string[] = [];
      const consoleErrors: string[] = [];
      const responses: NetworkRecord[] = [];
      page.on('pageerror', (e) => pageErrors.push(redact(e.message)));
      page.on('console', (m) => {
        if (m.type() === 'error')
          consoleErrors.push(redact(m.text()).slice(0, 300));
      });
      page.on('response', (r) =>
        responses.push({
          status: r.status(),
          method: r.request().method(),
          url: r.url(),
        })
      );

      const ctx: TourCtx = {
        page,
        locale: step.locale,
        role: step.role,
        seed,
        api,
        fixturesDir: FIXTURES,
      };

      // Load: navigation until the main content has rendered.
      const nav0 = Date.now();
      let actionError: string | null = null;
      try {
        await page.goto(step.path, { waitUntil: 'load', timeout: 60_000 });
        await page
          .waitForFunction(
            () =>
              (
                (document.querySelector('main') ?? document.body) as HTMLElement
              ).innerText.trim().length > 80,
            null,
            { timeout: 20_000 }
          )
          .catch(() => {});
      } catch (e) {
        actionError = `Navigation : ${(e as Error).message.split('\n')[0]}`;
      }
      const loadMs = Date.now() - nav0;
      await page
        .waitForLoadState('networkidle', { timeout: 6_000 })
        .catch(() => {});

      if (!actionError && step.actions) {
        try {
          await step.actions(ctx);
        } catch (e) {
          actionError = (e as Error).message.split('\n')[0]!.slice(0, 300);
        }
      }

      const expectResults: ExpectResult[] = [];
      for (const spec of step.expect ?? [])
        expectResults.push(await checkExpect(page, step, spec));

      // Let charts and animations settle, and map tiles finish loading,
      // before reading / capturing.
      await page.waitForTimeout(1_200);
      await page
        .evaluate(
          () =>
            new Promise<void>((resolve) => {
              const m = (
                window as unknown as {
                  __agrilogyMap?: {
                    areTilesLoaded(): boolean;
                    once(e: string, cb: () => void): void;
                  };
                }
              ).__agrilogyMap;
              if (!m || m.areTilesLoaded()) return resolve();
              const done = setTimeout(resolve, 8_000);
              m.once('idle', () => {
                clearTimeout(done);
                resolve();
              });
            })
        )
        .catch(() => {});
      let snap: PageSnapshot | null = null;
      try {
        snap = await snapshot(page);
      } catch {
        snap = null;
      }

      const file = `${nn}-${step.id}.png`;
      let shot: string | null = null;
      try {
        // Hide the Next.js dev-mode indicator: it is not part of the app.
        await page.addStyleTag({
          content: 'nextjs-portal { display: none !important; }',
        });
        await page.screenshot({
          path: path.join(SHOTS, file),
          fullPage: true,
          animations: 'disabled',
          timeout: 30_000,
        });
        shot = `shots/${file}`;
      } catch (e) {
        actionError ??= `Capture : ${(e as Error).message.split('\n')[0]}`;
      }
      if (step.cleanup) await step.cleanup(ctx).catch(() => {});

      const checks = evaluateStep(
        {
          locale: step.locale,
          expectedPath: step.path,
          requiresAuth: step.role !== 'guest',
          pageErrors,
          consoleErrors,
          responses,
          loadMs,
          snapshot: snap,
          expectResults,
          actionError,
          allow4xx: step.allow4xx,
        },
        {
          apiPrefixes: [API_URL, `${BASE_URL}/api-proxy/`],
          i18nNamespaces: I18N_NAMESPACES,
          isKnownKey: isMessageKey,
          // Logged on every page by antd's dev build; reported once, in the
          // run notes, instead of on each step.
          ignoreConsole: KNOWN_CONSOLE_NOISE,
        }
      );
      const status = worst(checks.map((c) => c.status));
      results.push({
        n,
        id: step.id,
        section: step.section,
        title: step.title,
        role: step.role,
        locale: step.locale,
        viewport: step.viewport,
        theme: step.theme ?? 'light',
        path: step.path,
        caption: step.caption,
        howToTest: step.howToTest,
        screenshot: shot,
        status,
        checks,
        timings: { loadMs, totalMs: Date.now() - t0 },
      });
      writeManifest(seed);
      test.info().annotations.push({
        type: status,
        description: checks
          .filter((c) => c.status !== 'pass')
          .map((c) => `${c.id}: ${c.detail}`)
          .join(' | '),
      });
      await api?.dispose();
      await context.close();
    });
  });
});
