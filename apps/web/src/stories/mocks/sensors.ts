/**
 * Invented sensor time series for the `Capteurs/…` stories (group C).
 * Shapes match the `/sensors/<name>` responses (one row per reading). Values
 * follow a plausible day/night cycle for a Moroccan farm; a seeded random keeps
 * every story identical from one build to the next. Timestamps end at the
 * current hour, so the "last reading" never looks stale.
 */

/** One row of `GET /sensors/<name>`. */
export interface SensorRow {
  id: number;
  timestamp: string;
  value: number;
  default_unit: string;
  available_units: string[];
  zone: number;
  user: number;
}

const HOUR = 3600_000;

/** Small deterministic PRNG (mulberry32), so screenshots don't change. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (v: number, digits: number) => Number(v.toFixed(digits));

/**
 * Hourly series over `days`, ending at the current hour. `fn` gets the local
 * hour of day (0–23), the hours elapsed since the start and a 0–1 random.
 */
export function hourlySeries(
  unit: string,
  fn: (hourOfDay: number, i: number, rnd: number) => number,
  { days = 7, seed = 1, digits = 2, stepHours = 1 } = {}
): SensorRow[] {
  const rnd = seeded(seed);
  const end = Math.floor(Date.now() / HOUR) * HOUR;
  const count = Math.floor((days * 24) / stepHours);
  return Array.from({ length: count }, (_, k) => {
    const ts = end - (count - 1 - k) * stepHours * HOUR;
    const hour = new Date(ts).getHours();
    return {
      id: seed * 100_000 + k,
      timestamp: new Date(ts).toISOString(),
      value: round(fn(hour, k * stepHours, rnd()), digits),
      default_unit: unit,
      available_units: [unit],
      zone: 1,
      user: 42,
    };
  });
}

/** Sine with its peak at `peakHour`, between -1 and 1. */
const diurnal = (hour: number, peakHour: number) =>
  Math.cos(((hour - peakHour) / 24) * 2 * Math.PI);

/** Air temperature, °C: ~12 °C at dawn, ~27 °C mid-afternoon. */
export const temperatureSeries = (days = 7) =>
  hourlySeries(
    '°C',
    (h, _i, r) => 19.5 + 7.5 * diurnal(h, 15) + (r - 0.5) * 1.6,
    { days, seed: 11, digits: 1 }
  );

/** Air relative humidity, %: humid nights, dry afternoons. */
export const humiditySeries = (days = 7) =>
  hourlySeries('%', (h, _i, r) => 60 - 22 * diurnal(h, 15) + (r - 0.5) * 6, {
    days,
    seed: 12,
    digits: 0,
  });

/** Hourly ET₀ rate, mm/h: zero at night, ~0.6 mm/h at solar noon. */
const et0Rate = (h: number, r: number, scale = 1) =>
  h < 7 || h > 19
    ? 0
    : Math.max(0, 0.62 * Math.sin(((h - 7) / 12) * Math.PI)) *
      scale *
      (0.9 + r * 0.2);

/** `GET /sensors/et0calculated`: the model's hourly ET₀ (mm/h). */
export const et0CalculatedSeries = (days = 7) =>
  hourlySeries('mm/h', (h, _i, r) => et0Rate(h, r), {
    days,
    seed: 21,
    digits: 3,
  });

/** `GET /sensors/et0weather`: the weather station's own ET₀ (mm/h). */
export const et0WeatherSeries = (days = 7) =>
  hourlySeries('mm/h', (h, _i, r) => et0Rate(h, r, 1.08), {
    days,
    seed: 22,
    digits: 3,
  });

/** `GET /weather/et0-series`: one Open-Meteo reference value per day, at noon. */
export const et0OpenMeteoSeries = (days = 7): SensorRow[] => {
  const rnd = seeded(23);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Array.from({ length: days }, (_, k) => ({
    id: 230_000 + k,
    timestamp: new Date(
      today.getTime() - (days - 1 - k) * 24 * HOUR
    ).toISOString(),
    value: round(4.6 + rnd() * 1.2, 2),
    default_unit: 'mm/h',
    available_units: ['mm/h'],
    zone: 1,
    user: 42,
  }));
};

/** Drip irrigation runs every morning from 06:00 to 08:00. */
const irrigating = (h: number) => h >= 6 && h < 8;

/**
 * Soil moisture (%) at one depth: jumps after the morning irrigation, then
 * dries out through the day. Deeper probes react later and less.
 */
const soilMoisture = (
  base: number,
  gain: number,
  lagHours: number,
  days: number,
  seed: number
) =>
  hourlySeries(
    '%',
    (h, _i, r) => {
      const sinceIrrigation = (h - 8 - lagHours + 24) % 24;
      return base + gain * Math.exp(-sinceIrrigation / 9) + (r - 0.5) * 0.8;
    },
    { days, seed, digits: 1 }
  );

/** `GET /sensors/soilmoisturelow` (shallow probe). */
export const soilLowSeries = (days = 7) => soilMoisture(21, 12, 0, days, 31);
/** `GET /sensors/soilmoisturemedium`. */
export const soilMediumSeries = (days = 7) => soilMoisture(26, 8, 2, days, 32);
/** `GET /sensors/soilmoisturehigh` (deep probe). */
export const soilHighSeries = (days = 7) => soilMoisture(30, 4, 4, days, 33);

/** `GET /sensors/waterflow`, m³/h: ~4.5 m³/h while irrigating, else 0. */
export const waterFlowSeries = (days = 7) =>
  hourlySeries('m³/h', (h, _i, r) => (irrigating(h) ? 4.2 + r * 0.6 : 0), {
    days,
    seed: 34,
    digits: 2,
  });

/** `GET /sensors/windspeed`, m/s: calm nights, breezy afternoons. */
export const windSpeedSeries = (days = 7) =>
  hourlySeries(
    'm/s',
    (h, i, r) =>
      Math.max(
        0,
        3.2 + 2.6 * diurnal(h, 16) + (r - 0.3) * 3 + (i > 96 ? 1.5 : 0)
      ),
    { days, seed: 41, digits: 1 }
  );

/**
 * `GET /sensors/winddirection`, degrees: mostly a north-westerly sea breeze,
 * with a hot easterly (chergui) over a couple of days.
 */
export const windDirectionSeries = (days = 7) =>
  hourlySeries(
    '°',
    (_h, i, r) => {
      const chergui = i >= 48 && i < 90;
      const centre = chergui ? 95 : 315;
      return (centre + (r - 0.5) * 70 + 360) % 360;
    },
    { days, seed: 42, digits: 0 }
  );
