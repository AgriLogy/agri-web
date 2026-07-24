/**
 * Pure presentation logic for the dashboard "sensors by group" tiles
 * (agri-web #127, redesign of the flat #95 list).
 *
 * Dependency-free on purpose (no DOM, no next-intl, no Chakra) so every rule is
 * unit-testable in isolation. The card component maps the returned category to
 * an icon + colour scheme and renders the relative time / status dot.
 */

export type SensorCategory =
  | 'soil'
  | 'water'
  | 'weather'
  | 'plant'
  | 'power'
  | 'other';

/**
 * Bucket a raw sensor_key into a visual domain. The API mixes canonical keys
 * (`soil_moisture_high`) with looser aliases (`ec_soil_high`, `ph_water`,
 * `et0_weather`), so this matches on substrings, order-sensitively: weather and
 * water are tested before soil because `pressure_weather` / `ph_water` contain
 * tokens the soil rule would otherwise claim.
 */
export function sensorCategory(sensorKey: string): SensorCategory {
  const k = sensorKey.toLowerCase();

  if (
    k.includes('weather') ||
    k.startsWith('et0') ||
    k === 'vpd' ||
    k.includes('wind') ||
    k.includes('solar') ||
    k.includes('precipitation') ||
    k.includes('_air') ||
    k.endsWith('air')
  ) {
    return 'weather';
  }
  if (
    k.includes('electric') ||
    k.includes('power') ||
    k.includes('consumption')
  ) {
    return 'power';
  }
  if (k.includes('water') || k.includes('irrigation') || k.includes('flow')) {
    return 'water';
  }
  if (
    k.includes('fruit') ||
    k.includes('leaf') ||
    k.includes('diameter') ||
    k.includes('grape')
  ) {
    return 'plant';
  }
  if (
    k.includes('soil') ||
    k.startsWith('ec_') ||
    k.includes('salinity') ||
    k.includes('moisture') ||
    k.includes('conductiv') ||
    k.includes('ph') ||
    k.includes('npk')
  ) {
    return 'soil';
  }
  return 'other';
}

/** Chakra colorScheme per category — the card derives icon + tint from this. */
export function categoryColorScheme(category: SensorCategory): string {
  switch (category) {
    case 'soil':
      return 'green';
    case 'water':
      return 'blue';
    case 'weather':
      return 'orange';
    case 'plant':
      return 'purple';
    case 'power':
      return 'yellow';
    default:
      return 'gray';
  }
}

export type Freshness = 'fresh' | 'recent' | 'stale' | 'never';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/**
 * How recent the newest reading is. `fresh` < 24 h, `recent` < 7 d, else
 * `stale`; a missing/unparseable timestamp is `never`. Devices the farmer has
 * unplugged legitimately read `stale`, which the dot then shows honestly.
 */
export function freshness(
  lastReceivedIso: string | null | undefined,
  nowMs: number
): Freshness {
  if (!lastReceivedIso) return 'never';
  const t = Date.parse(lastReceivedIso);
  if (Number.isNaN(t)) return 'never';
  const age = nowMs - t;
  if (age < DAY) return 'fresh';
  if (age < 7 * DAY) return 'recent';
  return 'stale';
}

/**
 * Localised relative time for the newest reading ("il y a 3 j", "3 days ago",
 * "منذ ٣ أيام"), or null when there is no timestamp. Uses `Intl` so it follows
 * the active locale without a translation table.
 */
export function relativeReceived(
  lastReceivedIso: string | null | undefined,
  nowMs: number,
  locale: string
): string | null {
  if (!lastReceivedIso) return null;
  const t = Date.parse(lastReceivedIso);
  if (Number.isNaN(t)) return null;
  const diff = t - nowMs; // negative → in the past
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (abs < HOUR) return rtf.format(Math.round(diff / 60_000), 'minute');
  if (abs < DAY) return rtf.format(Math.round(diff / HOUR), 'hour');
  if (abs < 30 * DAY) return rtf.format(Math.round(diff / DAY), 'day');
  if (abs < 365 * DAY)
    return rtf.format(Math.round(diff / (30 * DAY)), 'month');
  return rtf.format(Math.round(diff / (365 * DAY)), 'year');
}

/** Absolute, localised timestamp for the tooltip, or null when never received. */
export function exactReceived(
  lastReceivedIso: string | null | undefined,
  locale: string
): string | null {
  if (!lastReceivedIso) return null;
  const t = Date.parse(lastReceivedIso);
  if (Number.isNaN(t)) return null;
  const tag = locale === 'ar' ? 'ar' : locale === 'en' ? 'en-GB' : 'fr-FR';
  return new Date(t).toLocaleString(tag, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/** Fallback name for a sensor_key with no `sensors.*` translation. */
export function humanizeSensorKey(sensorKey: string): string {
  const words = sensorKey.replace(/[_-]+/g, ' ').trim().split(/\s+/);
  return words
    .map((w) => {
      const lower = w.toLowerCase();
      if (lower === 'ec') return 'EC';
      if (lower === 'ph') return 'pH';
      if (lower === 'et0') return 'ET₀';
      if (lower === 'vpd') return 'VPD';
      if (lower === 'npk') return 'NPK';
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}
