/**
 * Flexible notification "delivery rate" — the minimum period a user waits
 * before receiving the next notification for a given zone/sector.
 *
 * Designed to handle ANY situation: a rate is an `{ amount, unit }` pair
 * (e.g. every 20 minutes, every 4 hours, every day, every week, or any custom
 * value), so the product is not boxed into a fixed enum. The throttle decision
 * (`shouldDeliverNow`) is pure and time-injectable, which is what the unit
 * tests exercise across every period.
 */

export type DeliveryUnit = 'minute' | 'hour' | 'day' | 'week';

export interface DeliveryRate {
  amount: number;
  unit: DeliveryUnit;
}

export const DELIVERY_UNITS: readonly DeliveryUnit[] = [
  'minute',
  'hour',
  'day',
  'week',
];

/** Fixed (non-calendar) durations — predictable spacing, easy to reason about. */
export const UNIT_SECONDS: Record<DeliveryUnit, number> = {
  minute: 60,
  hour: 60 * 60,
  day: 24 * 60 * 60,
  week: 7 * 24 * 60 * 60,
};

export const MIN_AMOUNT = 1;
/** Generous upper bound so "every N weeks/days" stays sane but flexible. */
export const MAX_AMOUNT = 1000;

export const DEFAULT_DELIVERY_RATE: DeliveryRate = { amount: 1, unit: 'hour' };

export interface DeliveryRatePreset {
  /** i18n key under `notifications.deliveryRate.preset.*`. */
  key: string;
  rate: DeliveryRate;
}

/** The presets surfaced in the UI (from the GITEX user discussions). */
export const DELIVERY_RATE_PRESETS: readonly DeliveryRatePreset[] = [
  { key: 'every20min', rate: { amount: 20, unit: 'minute' } },
  { key: 'every1hour', rate: { amount: 1, unit: 'hour' } },
  { key: 'every4hours', rate: { amount: 4, unit: 'hour' } },
  { key: 'daily', rate: { amount: 1, unit: 'day' } },
  { key: 'weekly', rate: { amount: 1, unit: 'week' } },
];

export function isDeliveryUnit(u: unknown): u is DeliveryUnit {
  return (
    typeof u === 'string' && (DELIVERY_UNITS as readonly string[]).includes(u)
  );
}

/** Coerce arbitrary/legacy input into a valid rate (never throws). */
export function normalizeDeliveryRate(input: unknown): DeliveryRate {
  if (!input || typeof input !== 'object') return { ...DEFAULT_DELIVERY_RATE };
  const obj = input as { amount?: unknown; unit?: unknown };
  const unit = isDeliveryUnit(obj.unit) ? obj.unit : DEFAULT_DELIVERY_RATE.unit;
  const rawAmount = Number(obj.amount);
  const amount = Number.isFinite(rawAmount)
    ? Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, Math.round(rawAmount)))
    : DEFAULT_DELIVERY_RATE.amount;
  return { amount, unit };
}

export function deliveryRateToSeconds(rate: DeliveryRate): number {
  const r = normalizeDeliveryRate(rate);
  return r.amount * UNIT_SECONDS[r.unit];
}

export function deliveryRateToMs(rate: DeliveryRate): number {
  return deliveryRateToSeconds(rate) * 1000;
}

export function deliveryRateToMinutes(rate: DeliveryRate): number {
  return Math.round(deliveryRateToSeconds(rate) / 60);
}

/** Migration helper: turn a legacy `intervalMinutes` into the nicest rate. */
export function deliveryRateFromMinutes(totalMinutes: unknown): DeliveryRate {
  const m = Number(totalMinutes);
  if (!Number.isFinite(m) || m < 1) return { ...DEFAULT_DELIVERY_RATE };
  const mins = Math.round(m);
  // Pick the largest unit that divides evenly (week → day → hour → minute).
  for (const unit of ['week', 'day', 'hour'] as DeliveryUnit[]) {
    const unitMinutes = UNIT_SECONDS[unit] / 60;
    if (mins % unitMinutes === 0) {
      return normalizeDeliveryRate({ amount: mins / unitMinutes, unit });
    }
  }
  return normalizeDeliveryRate({ amount: mins, unit: 'minute' });
}

/** Returns the preset key whose duration matches this rate, else null (custom). */
export function matchPresetKey(rate: DeliveryRate): string | null {
  const target = deliveryRateToSeconds(rate);
  for (const p of DELIVERY_RATE_PRESETS) {
    if (deliveryRateToSeconds(p.rate) === target) return p.key;
  }
  return null;
}

export function presetByKey(key: string): DeliveryRatePreset | undefined {
  return DELIVERY_RATE_PRESETS.find((p) => p.key === key);
}

/** Parse a stored timestamp (ISO string or epoch ms) to epoch ms, or null. */
export function parseTimestamp(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const t = Date.parse(value);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

/**
 * Core throttle decision: may we deliver a notification right now, given the
 * configured rate and when the last one was sent?
 *
 * - Never sent (null/invalid timestamp) → always deliver.
 * - A timestamp in the future (clock skew / just set) → do NOT deliver.
 * - Otherwise deliver once at least `rate` has elapsed (inclusive boundary).
 */
export function shouldDeliverNow(
  rate: DeliveryRate,
  lastSentAt: unknown,
  now: number = Date.now()
): boolean {
  const last = parseTimestamp(lastSentAt);
  if (last == null) return true;
  if (last > now) return false;
  return now - last >= deliveryRateToMs(rate);
}

/** Milliseconds until the next delivery is allowed (0 = due now). */
export function msUntilNextDelivery(
  rate: DeliveryRate,
  lastSentAt: unknown,
  now: number = Date.now()
): number {
  const last = parseTimestamp(lastSentAt);
  if (last == null) return 0;
  const next = last + deliveryRateToMs(rate);
  return Math.max(0, next - now);
}

/** Epoch-ms timestamp at which the next delivery becomes allowed. */
export function nextDeliveryAt(
  rate: DeliveryRate,
  lastSentAt: unknown,
  now: number = Date.now()
): number {
  return now + msUntilNextDelivery(rate, lastSentAt, now);
}
