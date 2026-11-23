/**
 * Open-Meteo forecast response validation (agri-web QA tour, A3).
 *
 * The Météo card calls Open-Meteo straight from the browser. On a rate limit
 * or an outage it answers `{ "error": true, "reason": "…" }` (often with a
 * 4xx/5xx status) — no `current`, no `daily`. The card used to store that JSON
 * as-is, and the first `current.weather_code` read threw, taking the whole
 * dashboard down to "Something went wrong".
 *
 * Everything here is pure and dependency-free so it is unit-testable without
 * a DOM, React or next-intl. The output shape is NORMALIZED: every scalar is
 * `number | null` and every series is an array (possibly empty, entries
 * possibly null), so render code never has to guard against a missing key —
 * only against a null value, which the formatters below already do.
 */

export type Num = number | null;

export interface WeatherData {
  current: {
    time: string | null;
    temperature_2m: Num;
    relative_humidity_2m: Num;
    apparent_temperature: Num;
    precipitation: Num;
    weather_code: Num;
    wind_speed_10m: Num;
    wind_direction_10m: Num;
    wind_gusts_10m: Num;
    pressure_msl: Num;
    cloud_cover: Num;
  };
  hourly: {
    time: string[];
    temperature_2m: Num[];
    precipitation_probability: Num[];
    precipitation: Num[];
    uv_index: Num[];
    wind_speed_10m: Num[];
    wind_gusts_10m: Num[];
    relative_humidity_2m: Num[];
    dew_point_2m: Num[];
    soil_temperature_6cm: Num[];
    soil_moisture_3_to_9cm: Num[];
    et0_fao_evapotranspiration: Num[];
  };
  daily: {
    time: string[];
    weather_code: Num[];
    temperature_2m_max: Num[];
    temperature_2m_min: Num[];
    sunrise: string[];
    sunset: string[];
    uv_index_max: Num[];
    precipitation_sum: Num[];
    precipitation_probability_max: Num[];
    wind_speed_10m_max: Num[];
    wind_gusts_10m_max: Num[];
    wind_direction_10m_dominant: Num[];
    et0_fao_evapotranspiration: Num[];
    sunshine_duration: Num[];
  };
}

const CURRENT_NUM_KEYS = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'precipitation',
  'weather_code',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'pressure_msl',
  'cloud_cover',
] as const;

const HOURLY_NUM_KEYS = [
  'temperature_2m',
  'precipitation_probability',
  'precipitation',
  'uv_index',
  'wind_speed_10m',
  'wind_gusts_10m',
  'relative_humidity_2m',
  'dew_point_2m',
  'soil_temperature_6cm',
  'soil_moisture_3_to_9cm',
  'et0_fao_evapotranspiration',
] as const;

const DAILY_NUM_KEYS = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'uv_index_max',
  'precipitation_sum',
  'precipitation_probability_max',
  'wind_speed_10m_max',
  'wind_gusts_10m_max',
  'wind_direction_10m_dominant',
  'et0_fao_evapotranspiration',
  'sunshine_duration',
] as const;

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** A finite number, or null. */
export const toNum = (v: unknown): Num =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

const toStr = (v: unknown): string | null =>
  typeof v === 'string' && v.length > 0 ? v : null;

const numArr = (v: unknown): Num[] => (Array.isArray(v) ? v.map(toNum) : []);

const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x : '')) : [];

function pickNums<K extends string>(
  src: Obj,
  keys: readonly K[],
  conv: (v: unknown) => Num | Num[]
) {
  const out = {} as Record<K, ReturnType<typeof conv>>;
  for (const k of keys) out[k] = conv(src[k]);
  return out;
}

/**
 * Validate and normalize an Open-Meteo forecast response.
 *
 * Returns null — "no usable data" — when the HTTP status is not ok, the body
 * is not an object, it carries Open-Meteo's `error: true`, or it lacks the
 * `current` / `daily` blocks the card needs. Otherwise every field is coerced
 * to the normalized shape (missing → null / []).
 */
export function parseOpenMeteoResponse(
  ok: boolean,
  body: unknown
): WeatherData | null {
  if (!ok || !isObj(body)) return null;
  if (body.error === true) return null;
  const { current, hourly, daily } = body;
  if (!isObj(current) || !isObj(daily)) return null;
  const h: Obj = isObj(hourly) ? hourly : {};

  return {
    current: {
      time: toStr(current.time),
      ...(pickNums(current, CURRENT_NUM_KEYS, toNum) as Record<
        (typeof CURRENT_NUM_KEYS)[number],
        Num
      >),
    },
    hourly: {
      time: strArr(h.time),
      ...(pickNums(h, HOURLY_NUM_KEYS, numArr) as Record<
        (typeof HOURLY_NUM_KEYS)[number],
        Num[]
      >),
    },
    daily: {
      time: strArr(daily.time),
      sunrise: strArr(daily.sunrise),
      sunset: strArr(daily.sunset),
      ...(pickNums(daily, DAILY_NUM_KEYS, numArr) as Record<
        (typeof DAILY_NUM_KEYS)[number],
        Num[]
      >),
    },
  };
}

/**
 * Which data the card should show after a fetch: the fresh parse when it is
 * usable, otherwise the last good data (if any) — a transient Open-Meteo
 * failure must never blank a card that was already showing a forecast.
 */
export function nextWeatherData(
  previous: WeatherData | null,
  parsed: WeatherData | null
): WeatherData | null {
  return parsed ?? previous;
}

/** Rounded value, or the "—" placeholder when it is missing. */
export const roundOrDash = (v: Num, conv: (n: number) => number = (n) => n) =>
  v == null ? '—' : String(Math.round(conv(v)));

/** Fixed-decimals value, or "—" when it is missing. */
export const fixedOrDash = (v: Num, digits: number) =>
  v == null ? '—' : v.toFixed(digits);

/** Localized clock time for an ISO string, or "—" when missing / invalid. */
export function timeOrDash(
  iso: string | null | undefined,
  localeTag: string,
  opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleTimeString(localeTag, opts);
}
