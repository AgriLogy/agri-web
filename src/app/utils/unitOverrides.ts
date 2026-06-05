import {
  SENSOR_CATALOG,
  getCatalogDefaultUnit,
} from '@/app/utils/sensorCatalog';

const UNIT_OVERRIDES_KEY = 'frontendUnitOverrides';

const CATALOG_SENSOR_KEYS = new Set(SENSOR_CATALOG.map((s) => s.key));

export type UnitOverrideValue =
  | string
  | {
      unit?: string;
      readingLabel?: string;
      typeLabel?: string;
      scaleA?: number;
      offsetB?: number;
    };

export type UnitOverrideMap = Record<string, UnitOverrideValue>;

/**
 * Alias → canonical sensor key. The resolved value is a shared sensor
 * translation key: once a chart resolves a sensor key here, render its name
 * with `t('sensors.' + resolvedKey)`. Units stay numeric/universal strings.
 */
const DATA_KEY_TO_SENSOR_KEY: Record<string, string> = {
  wind_speed: 'wind_speed',
  wind_direction: 'wind_direction',
  wind_gust: 'wind_gust',
  value: 'value',
  temperature_weather: 'temperature_weather',
  temperature: 'temperature_weather',
  humidity_weather: 'humidity_weather',
  humidity: 'humidity_weather',
  solar_radiation: 'solar_radiation',
  precipitation_rate: 'precipitation_rate',
  leaf_temperature: 'leaf_temperature',
  leaf_moisture: 'leaf_moisture',
  et0: 'et0',
  /** ET0 chart: two series, same sensor calibration */
  et0_sensor: 'et0',
  et0_calculated: 'et0',
  vpd: 'vpd',
  pressure_weather: 'pressure_weather',
  waterFlow: 'water_flow',
  waterflow: 'water_flow',
  water_flow: 'water_flow',
  phwater: 'water_ph',
  waterec: 'water_ec',
  soilLow: 'soil_moisture_low',
  soilMedium: 'soil_moisture_medium',
  soilHigh: 'soil_moisture_high',
  low: 'soil_temp_low',
  medium: 'soil_temp_medium',
  high: 'soil_temp_high',
  salinity: 'soil_salinity',
  conductivity: 'soil_conductivity',
  soil_salinity: 'soil_salinity',
  soil_conductivity: 'soil_conductivity',
  /** Soil EC chart (low/high probes); avoid `low`/`high` — those map to soil temperature. */
  ec_low: 'soil_conductivity',
  ec_high: 'soil_conductivity',
  nitrogen: 'npk_n',
  phosphorus: 'npk_p',
  potassium: 'npk_k',
};

const NAME_TO_SENSOR_KEY: Record<string, string> = {
  "température de l'air (°c)": 'temperature_weather',
  'température (°c)': 'temperature_weather',
  'humidité (%)': 'humidity_weather',
  'vitesse du vent (km/h)': 'wind_speed',
  'vitesse du vent (m/s)': 'wind_speed',
  'rafale de vent (km/h)': 'wind_gust',
  'rafale de vent (m/s)': 'wind_gust',
  'direction du vent (°)': 'wind_direction',
  'rayonnement solaire (w/m²)': 'solar_radiation',
  'radiation solaire': 'solar_radiation',
  'rayonnement solaire': 'solar_radiation',
  'solar radiation (w/m²)': 'solar_radiation',
  'wind speed (m/s)': 'wind_speed',
  'wind direction (°)': 'wind_direction',
  'temperature (°c)': 'temperature_weather',
  'humidity (%)': 'humidity_weather',
  'precipitation (mm)': 'precipitation_rate',
  'vapor pressure deficit (kpa)': 'pressure_weather',
  'et₀ (mm)': 'et0',
  'et₀ (mm/h)': 'et0',
  'et0 capteur': 'et0',
  'et0 calculé': 'et0',
  'taux de précipitation (mm/h)': 'precipitation_rate',
  'précipitations cumulées': 'precipitation_rate',
  'irrigation (l/min)': 'water_flow',
  'pression (bar)': 'water_pressure',
  'pression (kpa)': 'water_pressure',
  'ph (-)': 'water_ph',
  'ph sol (-)': 'soil_ph',
  'conductivité électrique (µs/cm)': 'water_ec',
  'conductivité basse': 'soil_conductivity',
  'conductivité haute': 'soil_conductivity',
  irrigation: 'water_flow',
};

export function getUnitOverrideMap(): UnitOverrideMap {
  if (typeof window === 'undefined') return {};
  const raw = localStorage.getItem(UNIT_OVERRIDES_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as UnitOverrideMap;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export function getUnitOverride(
  sensorKey: string | undefined,
  fallback?: string
): string {
  if (!sensorKey) return fallback ?? '';
  const map = getUnitOverrideMap();
  const value = map[sensorKey];
  if (typeof value === 'string') return value || fallback || '';
  if (value && typeof value === 'object' && typeof value.unit === 'string') {
    return value.unit || fallback || '';
  }
  return fallback ?? '';
}

/**
 * Axis / legend label unit: user override, else API default, else catalogue default.
 * Use everywhere a chart exposes a sensor so Réglages stays consistent.
 */
export function resolveAxisUnit(
  sensorKey: string | undefined,
  apiDefaultUnit?: string | null
): string {
  if (!sensorKey) return '';
  const fromApi = apiDefaultUnit?.trim();
  const fromCatalog = getCatalogDefaultUnit(sensorKey);
  return getUnitOverride(sensorKey, fromApi || fromCatalog || undefined);
}

/**
 * For shared axes or panel titles: one unit if all probes match, otherwise
 * "u1 · u2" so labels track Réglages without hiding per-sensor differences.
 */
export function compactResolvedAxisUnits(
  sensorKeys: readonly string[],
  catalogFallback: string
): string {
  const units = sensorKeys.map((k) => resolveAxisUnit(k, catalogFallback));
  const uniq = [...new Set(units.map((u) => u.trim()).filter(Boolean))];
  if (uniq.length === 0) return catalogFallback;
  return uniq.length === 1 ? uniq[0]! : uniq.join(' · ');
}

export function getUnitOverrideFromDataKey(
  dataKey: string | undefined,
  fallback?: string
): string {
  if (!dataKey) return fallback?.trim() || '';
  const sensorKey = DATA_KEY_TO_SENSOR_KEY[dataKey] ?? dataKey;
  return resolveAxisUnit(sensorKey, fallback);
}

export function getUnitOverrideFromSeriesName(
  seriesName: string | undefined,
  fallback?: string
): string {
  if (!seriesName) return fallback?.trim() || '';
  const key = NAME_TO_SENSOR_KEY[seriesName.toLowerCase()];
  return key ? resolveAxisUnit(key, fallback) : fallback?.trim() || '';
}

export function getCalibrationForSensorKey(sensorKey: string): {
  scaleA: number;
  offsetB: number;
} {
  const map = getUnitOverrideMap();
  const v = map[sensorKey];
  if (v && typeof v === 'object') {
    return {
      scaleA:
        typeof v.scaleA === 'number' && Number.isFinite(v.scaleA)
          ? v.scaleA
          : 1,
      offsetB:
        typeof v.offsetB === 'number' && Number.isFinite(v.offsetB)
          ? v.offsetB
          : 0,
    };
  }
  return { scaleA: 1, offsetB: 0 };
}

/**
 * PDF: valeur réelle = (valeur brute) × facteur d'échelle + décalage.
 */
export function applySensorCalibration(
  sensorKey: string | undefined,
  raw: number
): number {
  if (!sensorKey || !Number.isFinite(raw)) return raw;
  const { scaleA, offsetB } = getCalibrationForSensorKey(sensorKey);
  return raw * scaleA + offsetB;
}

function formatCalibratedWaterFlow(v: number): string {
  const a = Math.abs(v);
  if (a >= 1000) return v.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
  if (a >= 100) return v.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
  if (a >= 1) return v.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  return v.toLocaleString('fr-FR', { maximumFractionDigits: 3 });
}

export function formatCalibratedReading(
  sensorKey: string | undefined,
  raw: number | null | undefined,
  decimals = 2,
  fallback = 'N/A'
): string {
  if (raw == null || !Number.isFinite(raw)) return fallback;
  const v = applySensorCalibration(sensorKey, raw);
  if (!Number.isFinite(v)) return fallback;
  if (sensorKey === 'water_flow') return formatCalibratedWaterFlow(v);
  return v.toFixed(decimals);
}

/** Resolve catalog sensor key for chart tooltip calibration (dataKey + series name). */
export function resolveSensorKeyForTooltip(
  dataKey?: string,
  seriesName?: string
): string | undefined {
  if (dataKey) {
    const mapped = DATA_KEY_TO_SENSOR_KEY[dataKey];
    if (mapped) return mapped;
    if (CATALOG_SENSOR_KEYS.has(dataKey)) return dataKey;
  }
  if (seriesName) {
    const k = NAME_TO_SENSOR_KEY[seriesName.toLowerCase()];
    if (k) return k;
  }
  return undefined;
}
