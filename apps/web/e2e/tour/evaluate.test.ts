import {
  evaluateStep,
  findSuspiciousText,
  isApiUrl,
  worst,
  type PageSnapshot,
  type StepSignals,
} from './evaluate';

const opts = {
  apiPrefixes: ['http://localhost:8080', 'http://localhost:3000/api-proxy/'],
  i18nNamespaces: ['misc', 'common', 'settings'],
};

const snap = (over: Partial<PageSnapshot> = {}): PageSnapshot => ({
  text: 'Tableau de bord — tout va bien',
  mainTextLength: 500,
  scrollWidth: 1440,
  innerWidth: 1440,
  brokenImages: [],
  htmlDir: 'ltr',
  htmlLang: 'fr',
  pathname: '/',
  ...over,
});

const signals = (over: Partial<StepSignals> = {}): StepSignals => ({
  locale: 'fr',
  expectedPath: '/',
  requiresAuth: true,
  pageErrors: [],
  consoleErrors: [],
  responses: [],
  loadMs: 1200,
  snapshot: snap(),
  expectResults: [],
  ...over,
});

const byId = (s: StepSignals, ignoreConsole: RegExp[] = []) =>
  Object.fromEntries(
    evaluateStep(s, { ...opts, ignoreConsole }).map((c) => [c.id, c])
  );

describe('worst', () => {
  it('ranks fail > warn > pass', () => {
    expect(worst([])).toBe('pass');
    expect(worst(['pass', 'warn'])).toBe('warn');
    expect(worst(['warn', 'fail', 'pass'])).toBe('fail');
  });
});

describe('findSuspiciousText', () => {
  it('flags placeholder values and raw i18n keys', () => {
    const hits = findSuspiciousText(
      'Volume NaN m³ · undefined · null · [object Object] · Invalid Date · misc.map.kml.button · foo.barBaz.qux',
      opts.i18nNamespaces
    ).join('\n');
    for (const s of [
      'NaN',
      'undefined',
      'null',
      '[object Object]',
      'Invalid Date',
      'misc.map.kml.button',
      'foo.barBaz.qux',
    ])
      expect(hits).toContain(s);
  });

  it('flags a two-segment match only when it is a real key', () => {
    const known = (k: string) => k === 'common.save';
    expect(
      findSuspiciousText(
        'Fichier misc.kml · common.save',
        ['misc', 'common'],
        known
      )
    ).toEqual(['« Fichier misc.kml · common.save »']);
    expect(
      findSuspiciousText('Choisir demo-farm.kml', ['farm'], known)
    ).toEqual([]);
  });

  it('leaves normal text, decimals, domains and file names alone', () => {
    expect(
      findSuspiciousText(
        'Déficit 32.1 mm · back.agrogo-datafarm.com · secteurs.geojson · nullité · Annulé',
        opts.i18nNamespaces
      )
    ).toEqual([]);
  });
});

it('isApiUrl matches by prefix', () => {
  expect(isApiUrl('http://localhost:8080/zones', opts.apiPrefixes)).toBe(true);
  expect(isApiUrl('http://localhost:3000/_next/x.js', opts.apiPrefixes)).toBe(
    false
  );
});

describe('evaluateStep', () => {
  it('passes a clean step', () => {
    const checks = evaluateStep(signals(), opts);
    expect(worst(checks.map((c) => c.status))).toBe('pass');
    expect(checks.map((c) => c.id)).not.toContain('rtl');
  });

  it('fails on page errors, 5xx, bad text, overflow, empty page, bounce', () => {
    const c = byId(
      signals({
        pageErrors: ['TypeError: x is undefined'],
        responses: [
          { status: 502, method: 'GET', url: 'http://localhost:8080/zones' },
        ],
        snapshot: snap({
          text: 'Total NaN mm',
          scrollWidth: 450,
          innerWidth: 390,
          mainTextLength: 5,
          pathname: '/login',
        }),
      })
    );
    expect(c['page-errors']!.status).toBe('fail');
    expect(c['api-5xx']!.status).toBe('fail');
    expect(c['api-5xx']!.detail).toContain('502 GET /zones');
    expect(c.text!.status).toBe('fail');
    expect(c.overflow!.detail).toContain('60 px');
    expect(c.content!.status).toBe('fail');
    expect(c.auth!.status).toBe('fail');
  });

  it('warns on console errors, unexpected 4xx, broken images, slow loads', () => {
    const c = byId(
      signals({
        consoleErrors: [
          'Warning: something',
          'Failed to load resource: the server responded with a status of 404',
        ],
        responses: [
          {
            status: 404,
            method: 'GET',
            url: 'http://localhost:3000/api-proxy/sensor-groups/0',
          },
          { status: 404, method: 'GET', url: 'http://localhost:8080/ok-404' },
          { status: 404, method: 'GET', url: 'https://tiles.example/x.png' },
        ],
        allow4xx: [/ok-404/],
        loadMs: 9_500,
        snapshot: snap({
          brokenImages: ['http://x/logo.png'],
          mainTextLength: 50,
        }),
      })
    );
    expect(
      byId(
        signals({ consoleErrors: ['Warning: [antd: App] When using cssVar'] }),
        [/antd: App/]
      )['console-errors']!.detail
    ).toBe('Aucune (bruit connu ignoré : 1).');
    expect(c['console-errors']!.status).toBe('warn');
    expect(c['console-errors']!.detail).toBe('Warning: something');
    expect(c['api-4xx']!.status).toBe('warn');
    expect(c['api-4xx']!.detail).toBe('404 GET /api-proxy/sensor-groups/0');
    expect(c.images!.status).toBe('warn');
    expect(c.load!.status).toBe('warn');
    expect(c.content!.status).toBe('warn');
  });

  it('checks right-to-left in Arabic', () => {
    expect(
      byId(
        signals({
          locale: 'ar',
          snapshot: snap({ htmlDir: 'rtl', htmlLang: 'ar' }),
        })
      ).rtl!.status
    ).toBe('pass');
    expect(byId(signals({ locale: 'ar' })).rtl!.status).toBe('fail');
  });

  it('reports missing expectations and failed actions', () => {
    const c = byId(
      signals({
        actionError: 'Timeout: bouton introuvable',
        expectResults: [
          { label: 'texte « Conseil »', ok: true },
          {
            label: 'bouton « Importer KML » absent',
            ok: false,
            detail: 'visible',
          },
        ],
      })
    );
    expect(c.actions!.status).toBe('fail');
    expect(c.expect!.status).toBe('fail');
    expect(c.expect!.detail).toBe('bouton « Importer KML » absent (visible)');
  });

  it('skips page checks when there is no snapshot', () => {
    const c = byId(signals({ snapshot: null }));
    expect(c.snapshot!.status).toBe('fail');
    expect(c.text).toBeUndefined();
  });
});
