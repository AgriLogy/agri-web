/**
 * Automatic evaluation of one screenshot-tour step. Pure: the tour collects
 * raw signals from the browser (errors, responses, a DOM snapshot, timings)
 * and this module turns them into pass / warn / fail checks, so every rule is
 * unit-testable without a browser (see evaluate.test.ts).
 */

export type Status = 'pass' | 'warn' | 'fail';

export interface Check {
  id: string;
  /** French label shown in the report. */
  label: string;
  status: Status;
  detail: string;
}

export interface NetworkRecord {
  status: number;
  method: string;
  url: string;
}

/** What the page looked like once the step settled. */
export interface PageSnapshot {
  /** `document.body.innerText` (visible text only). */
  text: string;
  /** Visible text length of `<main>` (or the body when there is none). */
  mainTextLength: number;
  scrollWidth: number;
  innerWidth: number;
  /** `src` of `<img>` elements that finished loading with no pixels. */
  brokenImages: string[];
  htmlDir: string | null;
  htmlLang: string | null;
  /** Final pathname (to catch a bounce to /login). */
  pathname: string;
}

export interface ExpectResult {
  label: string;
  ok: boolean;
  detail?: string;
}

export interface StepSignals {
  locale: 'fr' | 'ar' | 'en';
  /** The step navigates here; null for the public login page. */
  expectedPath: string;
  requiresAuth: boolean;
  pageErrors: string[];
  consoleErrors: string[];
  responses: NetworkRecord[];
  /** Navigation start → page usable (ms). */
  loadMs: number;
  snapshot: PageSnapshot | null;
  expectResults: ExpectResult[];
  /** Error thrown by the step's own actions, if any. */
  actionError?: string | null;
  /** 4xx API responses this step expects (e.g. a probe for a missing row). */
  allow4xx?: RegExp[];
}

export interface EvaluateOptions {
  /** Origins / path prefixes that count as API calls. */
  apiPrefixes: string[];
  /** Top-level next-intl namespaces (keys of fr.json): "misc", "common", … */
  i18nNamespaces: string[];
  isKnownKey?: (key: string) => boolean;
  /** Console messages that are known, already-reported noise. */
  ignoreConsole?: RegExp[];
  slowMs?: number;
}

export const SLOW_MS = 8_000;
const MAX_LIST = 6;

const RANK: Record<Status, number> = { pass: 0, warn: 1, fail: 2 };

/** The worst status of a list (pass when empty). */
export function worst(statuses: Status[]): Status {
  return statuses.reduce<Status>(
    (acc, s) => (RANK[s] > RANK[acc] ? s : acc),
    'pass'
  );
}

export function isApiUrl(url: string, prefixes: string[]): boolean {
  return prefixes.some((p) => url.startsWith(p));
}

const shortUrl = (u: string) => {
  try {
    const x = new URL(u);
    return `${x.pathname}${x.search}`;
  } catch {
    return u;
  }
};

const list = (items: string[]) => {
  const uniq = [...new Set(items)];
  const head = uniq.slice(0, MAX_LIST).join(' · ');
  return uniq.length > MAX_LIST
    ? `${head} · (+${uniq.length - MAX_LIST})`
    : head;
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Suspicious fragments in visible text: placeholder values that leaked into
 * the UI and raw next-intl keys. Returns short excerpts with context.
 */
export function findSuspiciousText(
  text: string,
  i18nNamespaces: string[],
  /** Two-segment matches ("farm.kml") count only if they are real keys. */
  isKnownKey: (key: string) => boolean = () => true
): string[] {
  const patterns: RegExp[] = [
    /\bNaN\b/g,
    /\bundefined\b/g,
    /\bnull\b/g,
    /\[object Object\]/g,
    /Invalid Date/g,
  ];
  if (i18nNamespaces.length) {
    patterns.push(
      new RegExp(
        `\\b(?:${i18nNamespaces.map(escapeRe).join('|')})\\.[A-Za-z][\\w]*(?:\\.[A-Za-z_][\\w]*)*\\b`,
        'g'
      )
    );
  }
  // Generic dotted camelCase key with 3+ segments ("foo.barBaz.qux").
  patterns.push(/\b[a-z][a-zA-Z0-9]*(?:\.[a-z][a-zA-Z0-9_]*){2,}\b/g);
  const hits: string[] = [];
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      if (m[0].split('.').length === 2 && !isKnownKey(m[0])) continue;
      const i = m.index ?? 0;
      const excerpt = text
        .slice(Math.max(0, i - 25), i + m[0].length + 25)
        .replace(/\s+/g, ' ')
        .trim();
      hits.push(`« ${excerpt} »`);
    }
  }
  return [...new Set(hits)];
}

/** Turn the raw signals of one step into its checks. */
export function evaluateStep(s: StepSignals, opts: EvaluateOptions): Check[] {
  const checks: Check[] = [];
  const add = (id: string, label: string, status: Status, detail: string) =>
    checks.push({ id, label, status, detail });

  // Actions (the scripted clicks) must have completed.
  add(
    'actions',
    'Actions du scénario',
    s.actionError ? 'fail' : 'pass',
    s.actionError ? s.actionError : 'Toutes les actions ont abouti.'
  );

  // Uncaught exceptions are always a failure; console errors a warning.
  add(
    'page-errors',
    'Erreurs JavaScript non interceptées',
    s.pageErrors.length ? 'fail' : 'pass',
    s.pageErrors.length ? list(s.pageErrors) : 'Aucune.'
  );
  // Failed requests are reported by the HTTP checks below, with their URL.
  const relevant = s.consoleErrors.filter(
    (m) => !/^Failed to load resource/.test(m)
  );
  const ignored = relevant.filter((m) =>
    (opts.ignoreConsole ?? []).some((re) => re.test(m))
  );
  const consoleErrors = relevant.filter((m) => !ignored.includes(m));
  add(
    'console-errors',
    'Erreurs dans la console',
    consoleErrors.length ? 'warn' : 'pass',
    consoleErrors.length
      ? list(consoleErrors)
      : ignored.length
        ? `Aucune (bruit connu ignoré : ${ignored.length}).`
        : 'Aucune.'
  );

  const api = s.responses.filter((r) => isApiUrl(r.url, opts.apiPrefixes));
  const server = api.filter((r) => r.status >= 500);
  const client = api.filter(
    (r) =>
      r.status >= 400 &&
      r.status < 500 &&
      !(s.allow4xx ?? []).some((re) => re.test(r.url))
  );
  const fmt = (r: NetworkRecord) =>
    `${r.status} ${r.method} ${shortUrl(r.url)}`;
  add(
    'api-5xx',
    'Réponses API en erreur serveur (5xx)',
    server.length ? 'fail' : 'pass',
    server.length ? list(server.map(fmt)) : `${api.length} appels, aucun 5xx.`
  );
  add(
    'api-4xx',
    'Réponses API 4xx inattendues',
    client.length ? 'warn' : 'pass',
    client.length ? list(client.map(fmt)) : 'Aucune.'
  );

  const snap = s.snapshot;
  if (!snap) {
    add('snapshot', 'Lecture de la page', 'fail', 'Page illisible.');
  } else {
    if (s.requiresAuth) {
      const bounced = snap.pathname.startsWith('/login');
      add(
        'auth',
        'Session',
        bounced ? 'fail' : 'pass',
        bounced
          ? `Renvoyé vers ${snap.pathname} au lieu de ${s.expectedPath}.`
          : 'Page ouverte avec la session.'
      );
    }
    const bad = findSuspiciousText(
      snap.text,
      opts.i18nNamespaces,
      opts.isKnownKey
    );
    add(
      'text',
      'Textes suspects (NaN, undefined, null, clés i18n…)',
      bad.length ? 'fail' : 'pass',
      bad.length ? list(bad) : 'Aucun.'
    );
    const overflow = snap.scrollWidth - snap.innerWidth;
    add(
      'overflow',
      'Débordement horizontal',
      overflow > 1 ? 'fail' : 'pass',
      overflow > 1
        ? `La page déborde de ${overflow} px (${snap.scrollWidth} > ${snap.innerWidth}).`
        : 'Aucun.'
    );
    add(
      'images',
      'Images cassées',
      snap.brokenImages.length ? 'warn' : 'pass',
      snap.brokenImages.length
        ? list(snap.brokenImages.map(shortUrl))
        : 'Aucune.'
    );
    add(
      'content',
      'Contenu principal',
      snap.mainTextLength < 20
        ? 'fail'
        : snap.mainTextLength < 80
          ? 'warn'
          : 'pass',
      `${snap.mainTextLength} caractères visibles.`
    );
    if (s.locale === 'ar') {
      const ok = snap.htmlDir === 'rtl' && snap.htmlLang === 'ar';
      add(
        'rtl',
        'Arabe : sens de lecture droite-à-gauche',
        ok ? 'pass' : 'fail',
        `html dir="${snap.htmlDir ?? ''}" lang="${snap.htmlLang ?? ''}".`
      );
    }
  }

  const slow = opts.slowMs ?? SLOW_MS;
  add(
    'load',
    'Temps de chargement',
    s.loadMs > slow ? 'warn' : 'pass',
    `${(s.loadMs / 1000).toFixed(1)} s${s.loadMs > slow ? ` (> ${slow / 1000} s)` : ''}.`
  );

  if (s.expectResults.length) {
    const missing = s.expectResults.filter((e) => !e.ok);
    add(
      'expect',
      'Éléments attendus',
      missing.length ? 'fail' : 'pass',
      missing.length
        ? list(
            missing.map((e) => `${e.label}${e.detail ? ` (${e.detail})` : ''}`)
          )
        : list(s.expectResults.map((e) => e.label))
    );
  }
  return checks;
}
