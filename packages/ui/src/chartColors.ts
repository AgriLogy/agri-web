/**
 * Per-sensor chart colour resolution.
 *
 * Single source of truth for which series colour each sensor/series key gets,
 * built on the {@link chartSeries} token palette. Charts should call
 * {@link colorForSensor} (or read {@link chartSeries} directly) instead of
 * hard-coding hex literals.
 *
 * The mapping preserves the exact colours the charts used before tokenisation,
 * so swapping a chart over to `colorForSensor('...')` is a no-op visually.
 */
import { chartSeries } from './tokens/colors';

/** Ordered fallback palette for unknown keys / numeric-index callers. */
const SERIES_ORDER = [
  chartSeries.green,
  chartSeries.blue,
  chartSeries.orange,
  chartSeries.red,
  chartSeries.indigo,
  chartSeries.amber,
  chartSeries.teal,
  chartSeries.emerald,
  chartSeries.gold,
  chartSeries.steelBlue,
] as const;

/**
 * Canonical series-key → colour map. Keys are the Recharts `dataKey`s used by
 * the analytics charts (and a few semantic aliases). Values come straight from
 * the {@link chartSeries} token palette.
 */
export const SENSOR_SERIES_COLORS = {
  // Default green single-series sensors
  wind_speed: chartSeries.green,
  water_flow: chartSeries.green,
  water_ph: chartSeries.green,
  water_ec: chartSeries.green,
  water_pressure: chartSeries.green,
  soil_ph: chartSeries.green,
  fruit_size: chartSeries.green,
  large_fruit_diameter: chartSeries.green,

  // Leaf
  leaf_temperature: chartSeries.orange,
  leaf_moisture: chartSeries.azure,

  // Solar
  solar_radiation: chartSeries.sun,

  // Water level / VPD
  water_level: chartSeries.blue,
  vpd: chartSeries.blue,

  // Soil-water humidity probes
  soilLow: chartSeries.burntOrange,
  soilMedium: chartSeries.green,
  soilHigh: chartSeries.amber,
  waterFlow: chartSeries.cobalt,

  // Soil temperature probes
  low: chartSeries.blue,
  medium: chartSeries.forest,
  high: chartSeries.red,

  // Soil conductivity (irrigation) probes
  ec_low: chartSeries.brightBlue,
  ec_high: chartSeries.emerald,
  water_flow_irrigation: chartSeries.skyBlue,

  // Weather temperature / humidity
  temperature: chartSeries.gold,
  humidity: chartSeries.teal,
  dew_point: chartSeries.indigo,

  // ET0
  et0_sensor: chartSeries.blue,
  et0_calculated: chartSeries.red,
  et0_openmeteo: chartSeries.orange,

  // Soil salinity / conductivity defaults
  soil_salinity: chartSeries.mustard,
  soil_conductivity: chartSeries.jade,

  // NPK defaults
  npk_n: chartSeries.mustard,
  npk_p: chartSeries.jade,
  npk_k: chartSeries.steelBlue,
} as const;

export type SensorSeriesKey = keyof typeof SENSOR_SERIES_COLORS;

/**
 * Resolve the series colour for a sensor/series.
 *
 * @param keyOrIndex - a known series key (see {@link SENSOR_SERIES_COLORS}) or a
 *   numeric index into the ordered fallback palette ({@link SERIES_ORDER}).
 * @returns a hex colour from the {@link chartSeries} token palette.
 */
export function colorForSensor(
  keyOrIndex: SensorSeriesKey | string | number
): string {
  if (typeof keyOrIndex === 'number') {
    const n = SERIES_ORDER.length;
    const idx = ((Math.trunc(keyOrIndex) % n) + n) % n;
    return SERIES_ORDER[idx];
  }
  const hit = (SENSOR_SERIES_COLORS as Record<string, string>)[keyOrIndex];
  return hit ?? SERIES_ORDER[0];
}
