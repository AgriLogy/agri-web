/**
 * Browser helpers for the screenshot tour: localized labels, the farm map
 * modal, sector selection, the forecast layer. Labels come from the app's own
 * message catalogues so the same actions work in French and in Arabic.
 */
import type { APIRequestContext, Locator, Page } from '@playwright/test';
import fr from '../../../../packages/i18n/src/messages/fr.json';
import ar from '../../../../packages/i18n/src/messages/ar.json';
import en from '../../../../packages/i18n/src/messages/en.json';
import type { Seed } from '../seed';

export type Locale = 'fr' | 'ar' | 'en';
export type Role = 'farmer' | 'technician' | 'guest';

const CATALOGUES: Record<Locale, unknown> = { fr, ar, en };

/** Top-level message namespaces, to recognise raw keys leaking into the UI. */
export const I18N_NAMESPACES = Object.keys(fr);

/** True when `key` is a leaf of the French catalogue. */
export function isMessageKey(key: string): boolean {
  let node: unknown = fr;
  for (const part of key.split('.')) {
    node = (node as Record<string, unknown> | undefined)?.[part];
  }
  return typeof node === 'string';
}

/** The UI string for `key` in `locale` (throws on a missing key). */
export function msg(locale: Locale, key: string): string {
  let node: unknown = CATALOGUES[locale];
  for (const part of key.split('.')) {
    node = (node as Record<string, unknown> | undefined)?.[part];
  }
  if (typeof node !== 'string') throw new Error(`i18n key not found: ${key}`);
  return node;
}

export interface TourCtx {
  page: Page;
  locale: Locale;
  role: Role;
  seed: Seed;
  /** API client authenticated as the step's user (null for guests). */
  api: APIRequestContext | null;
  fixturesDir: string;
}

type MapWindow = Window & {
  __agrilogyMap?: {
    loaded(): boolean;
    isStyleLoaded(): boolean;
    getSource(id: string): { serialize(): { data?: unknown } } | undefined;
    getCanvas(): HTMLCanvasElement;
    jumpTo(o: { center: [number, number]; zoom: number }): void;
    project(p: [number, number]): { x: number; y: number };
    once(ev: string, cb: () => void): void;
  };
  __tourPrevMap?: unknown;
};

/** Wait for the newest map instance to be loaded with its sectors drawn. */
export async function waitForMap(page: Page, minSectors = 1): Promise<void> {
  await page.waitForFunction(
    (min) => {
      const w = window as unknown as MapWindow;
      const m = w.__agrilogyMap;
      if (!m || m === w.__tourPrevMap || !m.isStyleLoaded()) return false;
      const data = m.getSource('agrilogy-sector-labels')?.serialize().data as
        | { features?: unknown[] }
        | undefined;
      return (data?.features?.length ?? 0) >= min;
    },
    minSectors,
    { timeout: 45_000 }
  );
}

async function mapIdle(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const m = (window as unknown as MapWindow).__agrilogyMap!;
        const done = setTimeout(resolve, 4000);
        m.once('idle', () => {
          clearTimeout(done);
          resolve();
        });
      })
  );
}

/** The dashboard's farm-map card, expanded into its full-screen modal. */
export async function openMapModal(
  ctx: TourCtx,
  minSectors = 1
): Promise<Locator> {
  const { page, locale } = ctx;
  // The dashboard card's map first, so the modal's is the next instance.
  await waitForMap(page, minSectors);
  await page.evaluate(() => {
    const w = window as unknown as MapWindow;
    w.__tourPrevMap = w.__agrilogyMap;
  });
  await page
    .getByRole('button', { name: msg(locale, 'misc.googleMapWeather.expand') })
    .click();
  const dialog = mapDialog(ctx);
  await dialog.waitFor({ state: 'visible' });
  await waitForMap(page, minSectors);
  return dialog;
}

export function mapDialog(ctx: TourCtx): Locator {
  return ctx.page
    .getByRole('dialog')
    .filter({
      has: ctx.page.getByRole('button', {
        name: msg(ctx.locale, 'misc.map.layersButton'),
      }),
    })
    .last();
}

type Ring = [number, number][];

/** A point inside the sector, away from its centre (sensors sit there). */
function clickPoint(geometry: {
  type: string;
  coordinates: unknown;
}): [number, number] {
  const ring = (
    geometry.type === 'MultiPolygon'
      ? (geometry.coordinates as Ring[][])[0]![0]
      : (geometry.coordinates as Ring[])[0]
  )!;
  const pts = ring.slice(0, -1);
  const c = pts.reduce<[number, number]>(
    (a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length],
    [0, 0]
  );
  const v = pts[0]!;
  return [c[0] + (v[0] - c[0]) * 0.35, c[1] + (v[1] - c[1]) * 0.35];
}

/** Select a sector on the current map by clicking inside its shape. */
export async function selectSector(ctx: TourCtx, name: string): Promise<void> {
  const { page } = ctx;
  if (!ctx.api) throw new Error('selectSector needs a signed-in user');
  const sectors = (await (await ctx.api.get('/sectors')).json()) as {
    name: string;
    geometry: { type: string; coordinates: unknown } | null;
  }[];
  const sector = sectors.find((s) => s.name === name);
  if (!sector?.geometry) throw new Error(`Secteur « ${name} » introuvable`);
  const target = clickPoint(sector.geometry);
  await page.evaluate((center) => {
    (window as unknown as MapWindow).__agrilogyMap!.jumpTo({
      center,
      zoom: 17,
    });
  }, target);
  await mapIdle(page);
  const box = await page.evaluate(() => {
    const m = (window as unknown as MapWindow).__agrilogyMap!;
    const r = m.getCanvas().getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.click(box.x, box.y);
  await page
    .locator('#sector-insights-panel:visible')
    .first()
    .waitFor({ timeout: 15_000 });
  // Let the insights / NDVI requests land.
  await page
    .waitForLoadState('networkidle', { timeout: 8_000 })
    .catch(() => {});
}

/** Scroll the first visible element matching `selector` into view. */
export async function reveal(page: Page, selector: string): Promise<void> {
  const el = page.locator(`${selector}:visible`).first();
  await el.waitFor({ timeout: 15_000 });
  await el.scrollIntoViewIfNeeded();
}

/** Turn the forecast layer on (or off) from the layers popover. */
export async function setForecastLayer(
  ctx: TourCtx,
  scope: Locator,
  on: boolean
): Promise<void> {
  const { page, locale } = ctx;
  await scope
    .getByRole('button', { name: msg(locale, 'misc.map.layersButton') })
    .click();
  const sw = page
    .getByRole('checkbox', { name: msg(locale, 'misc.map.layers.forecast') })
    .last();
  await sw.waitFor({ state: 'attached' });
  // The switch input is visually hidden: toggle it through the DOM.
  if ((await sw.isChecked()) !== on)
    await sw.evaluate((el) => (el as HTMLInputElement).click());
  await page.keyboard.press('Escape');
  if (on) {
    await page.getByTestId('forecast-legend').last().waitFor();
  }
}

/** Pick horizon / metric in the forecast legend overlay. */
export async function setForecastOptions(
  ctx: TourCtx,
  opts: { days?: 1 | 3 | 7; metric?: 'rain' | 'balance' }
): Promise<void> {
  const legend = ctx.page.getByTestId('forecast-legend').last();
  if (opts.days)
    await legend
      .getByLabel(msg(ctx.locale, 'misc.map.forecast.horizon'))
      .selectOption(String(opts.days));
  if (opts.metric)
    await legend
      .getByLabel(msg(ctx.locale, 'misc.map.forecast.metric'))
      .selectOption(opts.metric);
  // The legend shows a spinner while the new horizon is fetched.
  await legend
    .locator('.chakra-spinner')
    .waitFor({ state: 'detached', timeout: 30_000 })
    .catch(() => {});
}

/** Hover the sector so the forecast popup shows its values. */
export async function hoverSector(ctx: TourCtx, name: string): Promise<void> {
  const { page } = ctx;
  const sectors = (await (await ctx.api!.get('/sectors')).json()) as {
    name: string;
    geometry: { type: string; coordinates: unknown } | null;
  }[];
  const sector = sectors.find((s) => s.name === name);
  if (!sector?.geometry) throw new Error(`Secteur « ${name} » introuvable`);
  const p = await page.evaluate((pt) => {
    const m = (window as unknown as MapWindow).__agrilogyMap!;
    const r = m.getCanvas().getBoundingClientRect();
    const xy = m.project(pt);
    return { x: r.x + xy.x, y: r.y + xy.y };
  }, clickPoint(sector.geometry));
  await page.mouse.move(p.x, p.y);
  await page.mouse.move(p.x + 2, p.y + 2);
  await page.locator('.agrilogy-forecast-popup').waitFor({ timeout: 8_000 });
}

/** Clicks on the map canvas at offsets (px) from its centre. */
export async function clickCanvas(
  page: Page,
  offsets: [number, number][]
): Promise<void> {
  const box = await page.evaluate(() => {
    const m = (window as unknown as MapWindow).__agrilogyMap!;
    const r = m.getCanvas().getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  for (const [dx, dy] of offsets) {
    await page.mouse.click(box.x + dx, box.y + dy);
    await page.waitForTimeout(250);
  }
}
