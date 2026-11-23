/**
 * Correspondance clé catalogue → endpoint API `/sensors/{slug}` (GET, params date + zone).
 *
 * Every `path` here MUST be a slug agri-api serves (`fastapp/sensors.py`
 * `SENSOR_SPEC`). A catalog key with no backing slug is `unavailable`: callers
 * skip the request and render "—" instead of firing a guaranteed 404.
 */
export type NpkComponent = 'n' | 'p' | 'k';

export type SensorEndpointSpec =
  | { kind: 'single'; path: string }
  | { kind: 'firstNonEmpty'; paths: string[] }
  | {
      kind: 'npk';
      path: string;
      component: NpkComponent;
    }
  | {
      /** No agri-api slug backs this key: never request it, show "—". */
      kind: 'unavailable';
    };

const SPECS: Record<string, SensorEndpointSpec> = {
  // Device-health metrics (LoRaWAN nodes report battery + signal; Bivocom
  // reports signal). Shown per-zone only when the device actually has data.
  battery: { kind: 'single', path: '/sensors/battery' },
  signal: { kind: 'single', path: '/sensors/signal' },
  solar_radiation: { kind: 'single', path: '/sensors/solarradiation' },
  temperature_weather: {
    kind: 'single',
    path: '/sensors/temperatureweather',
  },
  humidity_weather: { kind: 'single', path: '/sensors/humidityweather' },
  pressure_weather: {
    kind: 'single',
    path: '/sensors/pressureweather',
  },
  wind_speed: { kind: 'single', path: '/sensors/windspeed' },
  // agri-api has no gust slug (`/sensors/windgust` 404s) — QA tour A6.
  wind_gust: { kind: 'unavailable' },
  wind_direction: { kind: 'single', path: '/sensors/winddirection' },
  et0: {
    kind: 'firstNonEmpty',
    paths: ['/sensors/et0weather', '/sensors/et0calculated'],
  },
  vpd: { kind: 'single', path: '/sensors/vpdweather' },
  precipitation_rate: {
    kind: 'single',
    path: '/sensors/precipitationrate',
  },
  water_flow: { kind: 'single', path: '/sensors/waterflow' },
  // No cumulative-irrigation slug on agri-api (`/sensors/irrigationcumulative`
  // 404s) — QA tour A6.
  irrigation_cumulative: { kind: 'unavailable' },
  water_level: { kind: 'single', path: '/sensors/waterlevel' },
  water_pressure: { kind: 'single', path: '/sensors/waterpressure' },
  water_ph: { kind: 'single', path: '/sensors/phwater' },
  water_ec: { kind: 'single', path: '/sensors/waterec' },
  soil_moisture_low: { kind: 'single', path: '/sensors/soilmoisturelow' },
  soil_moisture_medium: {
    kind: 'single',
    path: '/sensors/soilmoisturemedium',
  },
  soil_moisture_high: {
    kind: 'single',
    path: '/sensors/soilmoisturehigh',
  },
  soil_temp_low: { kind: 'single', path: '/sensors/soiltemperaturelow' },
  soil_temp_medium: {
    kind: 'single',
    path: '/sensors/soiltemperaturemedium',
  },
  soil_temp_high: {
    kind: 'single',
    path: '/sensors/soiltemperaturehigh',
  },
  soil_ph: { kind: 'single', path: '/sensors/phsoil' },
  soil_salinity: { kind: 'single', path: '/sensors/soilsalinity' },
  soil_conductivity: {
    kind: 'single',
    path: '/sensors/soilconductivity',
  },
  leaf_temperature: {
    kind: 'single',
    path: '/sensors/leaftemperature',
  },
  leaf_moisture: { kind: 'single', path: '/sensors/leafmoisture' },
  npk_n: { kind: 'npk', path: '/sensors/npk', component: 'n' },
  npk_p: { kind: 'npk', path: '/sensors/npk', component: 'p' },
  npk_k: { kind: 'npk', path: '/sensors/npk', component: 'k' },
  fruit_size: { kind: 'single', path: '/sensors/fruitsize' },
  large_fruit_diameter: {
    kind: 'single',
    path: '/sensors/largefruitdiameter',
  },
  electricity_consumption: {
    kind: 'single',
    path: '/sensors/electricityconsumption',
  },
};

/** True when the key maps to at least one real agri-api endpoint. */
export function hasSensorEndpoint(sensorKey: string): boolean {
  const spec = SPECS[sensorKey];
  return spec != null && spec.kind !== 'unavailable';
}

/** Every concrete `/sensors/...` path the catalog may request (for tests). */
export function listSensorEndpointPaths(): string[] {
  const out = new Set<string>();
  for (const spec of Object.values(SPECS)) {
    if (spec.kind === 'single' || spec.kind === 'npk') out.add(spec.path);
    else if (spec.kind === 'firstNonEmpty')
      spec.paths.forEach((p) => out.add(p));
  }
  return [...out].sort();
}

export function getSensorEndpointSpec(
  sensorKey: string
): SensorEndpointSpec | null {
  return SPECS[sensorKey] ?? null;
}
