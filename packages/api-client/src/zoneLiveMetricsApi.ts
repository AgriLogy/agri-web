/**
 * Live per-zone metric snapshot for the notification cards.
 *
 * The zone-notification cards used to render every metric as a placeholder
 * "—" (the provisional local template). This assembles the zone's real latest
 * readings from the per-sensor endpoints so the cards show actual values.
 *
 * Sensor → card-field mapping (defaults; the backend has several soil streams):
 *   air temperature   → /sensors/temperatureweather   (today = latest, yesterday = prior day)
 *   air humidity      → /sensors/humidityweather       (today / yesterday)
 *   ET₀               → /sensors/et0calculated         (our FAO-56, latest)
 *   soil humidity     → /sensors/soilmoisturemedium    (latest)
 *   soil temperature  → /sensors/soiltemperaturemedium (latest)
 *   soil pH           → /sensors/phsoil                (latest)
 *
 * Irrigation fields are left to the existing decision engine / config — this
 * only fills the weather + soil + ET₀ slots.
 */
import api from './api';

export interface SensorReading {
  timestamp: string;
  value: number | null;
}

export interface ZoneLiveMetrics {
  today_temperature?: string;
  yesterday_temperature?: string;
  today_humidity?: string;
  yesterday_humidity?: string;
  ET0?: string;
  soil_humidity?: string;
  soil_temperature?: string;
  soil_ph?: string;
}

/** Round to one decimal and stringify; undefined when there is no usable value. */
export function formatMetric(v: number | null | undefined): string | undefined {
  if (v == null || !Number.isFinite(v)) return undefined;
  return (Math.round(v * 10) / 10).toString();
}

/** Newest reading with a value (max ISO timestamp — lexical compare is safe for ISO). */
export function latestReading(
  rows: readonly SensorReading[]
): SensorReading | undefined {
  let best: SensorReading | undefined;
  for (const r of rows) {
    if (!r || r.timestamp == null || r.value == null) continue;
    if (!best || r.timestamp > best.timestamp) best = r;
  }
  return best;
}

/** Newest reading on a day BEFORE the latest reading's day (for the "yesterday" slot). */
export function priorDayReading(
  rows: readonly SensorReading[]
): SensorReading | undefined {
  const latest = latestReading(rows);
  if (!latest) return undefined;
  const latestDay = latest.timestamp.slice(0, 10);
  let best: SensorReading | undefined;
  for (const r of rows) {
    if (!r || r.timestamp == null || r.value == null) continue;
    if (r.timestamp.slice(0, 10) === latestDay) continue;
    if (
      r.timestamp < latest.timestamp &&
      (!best || r.timestamp > best.timestamp)
    ) {
      best = r;
    }
  }
  return best;
}

/** Pure: turn the raw per-sensor arrays into formatted card values (testable). */
export function buildZoneLiveMetrics(raw: {
  temperature?: readonly SensorReading[];
  humidity?: readonly SensorReading[];
  et0?: readonly SensorReading[];
  soilMoisture?: readonly SensorReading[];
  soilTemp?: readonly SensorReading[];
  soilPh?: readonly SensorReading[];
}): ZoneLiveMetrics {
  const t = raw.temperature ?? [];
  const h = raw.humidity ?? [];
  return {
    today_temperature: formatMetric(latestReading(t)?.value),
    yesterday_temperature: formatMetric(priorDayReading(t)?.value),
    today_humidity: formatMetric(latestReading(h)?.value),
    yesterday_humidity: formatMetric(priorDayReading(h)?.value),
    ET0: formatMetric(latestReading(raw.et0 ?? [])?.value),
    soil_humidity: formatMetric(latestReading(raw.soilMoisture ?? [])?.value),
    soil_temperature: formatMetric(latestReading(raw.soilTemp ?? [])?.value),
    soil_ph: formatMetric(latestReading(raw.soilPh ?? [])?.value),
  };
}

/** Keep only the defined metric keys (so a merge never overwrites with undefined). */
export function definedMetrics(m: ZoneLiveMetrics): Partial<ZoneLiveMetrics> {
  const out: Partial<ZoneLiveMetrics> = {};
  (Object.keys(m) as (keyof ZoneLiveMetrics)[]).forEach((k) => {
    if (m[k] != null) out[k] = m[k];
  });
  return out;
}

async function getSensor(
  path: string,
  zoneId: number
): Promise<SensorReading[]> {
  try {
    const res = await api.get<SensorReading[]>(path, {
      params: { zone_id: zoneId },
    });
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
}

/** Fetch a zone's latest weather/soil/ET₀ readings and format them for the cards. */
export async function fetchZoneLiveMetrics(
  zoneId: number
): Promise<ZoneLiveMetrics> {
  const [temperature, humidity, et0, soilMoisture, soilTemp, soilPh] =
    await Promise.all([
      getSensor('/sensors/temperatureweather', zoneId),
      getSensor('/sensors/humidityweather', zoneId),
      getSensor('/sensors/et0calculated', zoneId),
      getSensor('/sensors/soilmoisturemedium', zoneId),
      getSensor('/sensors/soiltemperaturemedium', zoneId),
      getSensor('/sensors/phsoil', zoneId),
    ]);
  return buildZoneLiveMetrics({
    temperature,
    humidity,
    et0,
    soilMoisture,
    soilTemp,
    soilPh,
  });
}
