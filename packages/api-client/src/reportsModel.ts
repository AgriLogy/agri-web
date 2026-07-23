/**
 * Pure logic behind the Reports / Historique page (agri-web #102, RPT-1).
 *
 * Dependency-free on purpose (only type-only imports, erased at build time) so
 * every rule here is unit-testable without a DOM, axios or next-intl — the same
 * split as `sensorGroupModel.ts` / `zonePickerChoices.ts`.
 *
 * Four concerns live here:
 *   1. turning the page's filters into the snake_case query params the two
 *      report endpoints expect, dropping anything empty so a blank filter is
 *      never sent as `""`;
 *   2. the outcome-vs-inputs split of an irrigation decision — the decision
 *      columns on one side, the water-balance terms (shown behind an expandable
 *      detail) on the other;
 *   3. value formatting (timestamps, measures, channels) that must be
 *      deterministic regardless of the runner's timezone;
 *   4. distinguishing "no rows in range" from "the backing tables are not
 *      deployed", read off the envelope's `schema_available` flag.
 */

import type {
  AlertEventQuery,
  IrrigationDecision,
  IrrigationDecisionInputs,
  IrrigationDecisionQuery,
  ReportEnvelope,
} from './reportsApi';

// ---------------------------------------------------------------------------
// Filters → query params
// ---------------------------------------------------------------------------

/** How many rows a page requests. The router caps at 500; 50 keeps it snappy. */
export const REPORTS_PAGE_SIZE = 50;

/** The page's alert-history filter state, in UI-friendly camelCase. */
export interface AlertEventFilters {
  /** Inclusive lower bound, ISO-8601 UTC. */
  start?: string | null;
  /** Inclusive upper bound, ISO-8601 UTC. */
  end?: string | null;
  zoneId?: number | null;
  sensorKey?: string | null;
  limit?: number;
  offset?: number;
}

/** The page's decision-history filter state. */
export interface IrrigationDecisionFilters {
  start?: string | null;
  end?: string | null;
  zoneId?: number | null;
  source?: string | null;
  /** Tri-state: `true`/`false` filter, `null`/`undefined` = both. */
  irrigate?: boolean | null;
  limit?: number;
  offset?: number;
}

const isBlank = (v: unknown): boolean =>
  v == null || (typeof v === 'string' && v.trim() === '');

/**
 * Build the `/reports/alert-events` query params from the page's filters.
 *
 * Empty filters are dropped entirely (never sent as `""` or `null`) so the
 * server applies its own defaults; `zone_id` is only sent when a real zone is
 * chosen. `limit`/`offset` default to the standard page.
 */
export function buildAlertEventParams(
  filters: AlertEventFilters = {}
): AlertEventQuery {
  const params: AlertEventQuery = {
    limit: filters.limit ?? REPORTS_PAGE_SIZE,
    offset: filters.offset ?? 0,
  };
  if (!isBlank(filters.start)) params.start = filters.start as string;
  if (!isBlank(filters.end)) params.end = filters.end as string;
  if (filters.zoneId != null) params.zone_id = filters.zoneId;
  if (!isBlank(filters.sensorKey)) params.sensor_key = filters.sensorKey as string;
  return params;
}

/** Build the `/reports/irrigation-decisions` query params from the filters. */
export function buildIrrigationDecisionParams(
  filters: IrrigationDecisionFilters = {}
): IrrigationDecisionQuery {
  const params: IrrigationDecisionQuery = {
    limit: filters.limit ?? REPORTS_PAGE_SIZE,
    offset: filters.offset ?? 0,
  };
  if (!isBlank(filters.start)) params.start = filters.start as string;
  if (!isBlank(filters.end)) params.end = filters.end as string;
  if (filters.zoneId != null) params.zone_id = filters.zoneId;
  if (!isBlank(filters.source)) params.source = filters.source as string;
  // Only send `irrigate` when it is an explicit boolean — `null` means "both".
  if (filters.irrigate === true || filters.irrigate === false) {
    params.irrigate = filters.irrigate;
  }
  return params;
}

/**
 * Turn a UI date range (calendar `YYYY-MM-DD`, inclusive both ends) into the
 * ISO-8601 UTC instants the endpoints filter on: the start of the first day and
 * the last instant of the last day, so a same-day range still spans 24h.
 */
export function isoRangeFromDates(
  startDate: string,
  endDate: string
): { start: string; end: string } {
  return {
    start: `${startDate}T00:00:00Z`,
    end: `${endDate}T23:59:59Z`,
  };
}

// ---------------------------------------------------------------------------
// Irrigation decision: outcome ⟂ inputs split
// ---------------------------------------------------------------------------

/** The decision itself — what the farmer reads at a glance, minus the inputs. */
export interface DecisionOutcome {
  decidedAt: string;
  zoneId: number | null;
  source: string;
  irrigate: boolean;
  reason: string;
  netMm: number | null;
  grossMm: number | null;
  volumeM3: number | null;
  durationHr: number | null;
  summary: string;
}

/** One water-balance term, ready to render as a label:value pair. */
export interface DecisionInputRow {
  /** Raw input key, e.g. "et0_mm" — the UI resolves it to a localized label. */
  key: string;
  value: number | null;
}

/**
 * Split a decision into its outcome and its water-balance inputs.
 *
 * This is the load-bearing separation of the whole page. The outcome is the
 * verdict (irrigate? how much? why?) shown in the row; the inputs are the
 * agronomy terms (ET₀, ETc, depletion, soil moisture…) shown ONLY behind the
 * expandable detail. They must never cross over: a wrong split would either
 * spill input numbers into the decision columns (e.g. render `et0_mm` where
 * `volume_m3` belongs) or hide the real inputs, so the detail drawer shows
 * nothing — both are asserted against in the unit tests.
 */
export function splitDecision(decision: IrrigationDecision): {
  outcome: DecisionOutcome;
  inputs: DecisionInputRow[];
} {
  const outcome: DecisionOutcome = {
    decidedAt: decision.decided_at,
    zoneId: decision.zone_id,
    source: decision.source,
    irrigate: decision.irrigate,
    reason: decision.reason,
    netMm: decision.net_mm,
    grossMm: decision.gross_mm,
    volumeM3: decision.volume_m3,
    durationHr: decision.duration_hr,
    summary: decision.summary,
  };
  return { outcome, inputs: decisionInputRows(decision.inputs) };
}

/** Preferred display order for the water-balance terms we know about. */
const KNOWN_INPUT_ORDER = [
  'et0_mm',
  'etc_mm',
  'dr_today_mm',
  'soil_moisture_pct',
];

/**
 * Flatten the `inputs` object into ordered rows: the known agronomy terms
 * first (in agronomic reading order), then any extra numeric term agri-api
 * adds later, so a schema addition still surfaces instead of being dropped.
 * Non-numeric / nullish entries are coerced to `null` (rendered as "—").
 */
export function decisionInputRows(
  inputs: IrrigationDecisionInputs | null | undefined
): DecisionInputRow[] {
  if (!inputs) return [];
  const seen = new Set<string>();
  const rows: DecisionInputRow[] = [];
  const push = (key: string) => {
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({ key, value: toNumberOrNull(inputs[key]) });
  };
  for (const key of KNOWN_INPUT_ORDER) {
    if (key in inputs) push(key);
  }
  for (const key of Object.keys(inputs)) push(key);
  return rows;
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}

// ---------------------------------------------------------------------------
// Formatting (timezone-independent by construction)
// ---------------------------------------------------------------------------

const EM_DASH = '—';

/**
 * Format an ISO-8601 UTC instant as `YYYY-MM-DD HH:mm` (UTC).
 *
 * Done by slicing the ISO string rather than `new Date().toLocale…` so the
 * output is identical on every machine — a test asserting a timestamp must not
 * depend on the CI runner's timezone. Returns "—" for null/unparseable input.
 */
export function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return EM_DASH;
  const match =
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(iso.trim());
  if (!match) return EM_DASH;
  const [, y, mo, d, h, mi] = match;
  return `${y}-${mo}-${d} ${h}:${mi}`;
}

/** Format a numeric measure with its unit, e.g. `formatMeasure(12.34, "mm")`. */
export function formatMeasure(
  value: number | null | undefined,
  unit?: string | null,
  maxFractionDigits = 2
): string {
  if (value == null || !Number.isFinite(value)) return EM_DASH;
  const rounded = roundTo(value, maxFractionDigits);
  const num = trimTrailingZeros(rounded);
  const u = unit?.trim();
  return u ? `${num} ${u}` : num;
}

function roundTo(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round((value + Number.EPSILON) * f) / f;
}

function trimTrailingZeros(value: number): string {
  // Number(...).toString() already drops trailing zeros ("12.30" → "12.3");
  // this keeps integers integer-looking and avoids scientific notation.
  return String(value);
}

/**
 * Render the observed-vs-threshold pair one alert tripped on, e.g.
 * `"1.2 °C / 3 °C"` (observed / threshold, shared unit). Either side may be
 * missing.
 */
export function formatObservedVsThreshold(
  observed: number | null | undefined,
  threshold: number | null | undefined,
  unit?: string | null
): string {
  return `${formatMeasure(observed, unit)} / ${formatMeasure(threshold, unit)}`;
}

/** Join notified channels for display, or "—" when none went out. */
export function formatChannels(channels: string[] | null | undefined): string {
  if (!channels || channels.length === 0) return EM_DASH;
  return channels.join(', ');
}

/**
 * Normalize an enum value to a safe i18n key segment: lowercase, non-alphanumeric
 * runs collapsed to `_`. So `"Water balance"` and `"water_balance"` both map to
 * `water_balance`, keeping the i18n lookup stable across minor backend wording.
 */
export function enumKeySegment(value: string | null | undefined): string {
  if (!value) return 'unknown';
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'unknown';
}

/**
 * Human fallback for an enum value with no translation: `"sufficient_moisture"`
 * → `"Sufficient moisture"`. Guarantees a report never shows a raw snake_case
 * token even for a value the i18n catalogue has not caught up with.
 */
export function humanizeEnum(value: string | null | undefined): string {
  if (!value) return EM_DASH;
  const spaced = value.trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!spaced) return EM_DASH;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// ---------------------------------------------------------------------------
// Availability & pagination
// ---------------------------------------------------------------------------

/** The four states the two report panels can be in. */
export type ReportViewState = 'loading' | 'unavailable' | 'empty' | 'ready';

/**
 * Decide what a panel should show, keeping "the tables aren't deployed"
 * (`schema_available: false`) distinct from "no rows in this range" — the same
 * degraded-vs-empty distinction the sensor-groups feature makes, so a farmer
 * with no history isn't told the feature is broken.
 */
export function reportViewState(
  envelope: ReportEnvelope<unknown> | null | undefined,
  loading: boolean
): ReportViewState {
  if (loading && !envelope) return 'loading';
  if (!envelope) return 'loading';
  if (envelope.schema_available === false) return 'unavailable';
  if ((envelope.results?.length ?? 0) === 0) return 'empty';
  return 'ready';
}

/** Whether a further page exists after the current offset. */
export function hasNextPage(
  count: number,
  limit: number,
  offset: number
): boolean {
  return offset + limit < count;
}

/** Whether an earlier page exists before the current offset. */
export function hasPrevPage(offset: number): boolean {
  return offset > 0;
}

/**
 * The `from–to of total` window for the pager caption, 1-based and inclusive.
 * `resultCount` is how many rows this page actually returned (the last page is
 * usually short), so `to` never overstates the range.
 */
export function pageWindow(
  offset: number,
  resultCount: number,
  count: number
): { from: number; to: number; total: number } {
  if (resultCount <= 0 || count <= 0) {
    return { from: 0, to: 0, total: Math.max(count, 0) };
  }
  return { from: offset + 1, to: offset + resultCount, total: count };
}
