/**
 * Correspondance clé catalogue → endpoint API `/api/sensors/.../` (GET, params date + zone).
 * Les clés sans endpoint dédié restent à compléter côté backend.
 */
export type NpkComponent = 'n' | 'p' | 'k';

export type SensorEndpointSpec =
  | { kind: 'single'; path: string }
  | { kind: 'firstNonEmpty'; paths: string[] }
  | {
      kind: 'npk';
      path: string;
      component: NpkComponent;
    };

const SPECS: Record<string, SensorEndpointSpec> = {
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
  wind_gust: { kind: 'single', path: '/sensors/windgust' },
  wind_direction: { kind: 'single', path: '/sensors/winddirection' },
  et0: {
    kind: 'firstNonEmpty',
    paths: ['/sensors/et0weather', '/sensors/et0calculated'],
  },
  vpd: { kind: 'single', path: '/sensors/vpd' },
  precipitation_rate: {
    kind: 'single',
    path: '/sensors/precipitationrate',
  },
  water_flow: { kind: 'single', path: '/sensors/waterflow' },
  irrigation_cumulative: {
    kind: 'single',
    path: '/sensors/irrigationcumulative',
  },
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

export function getSensorEndpointSpec(
  sensorKey: string
): SensorEndpointSpec | null {
  return SPECS[sensorKey] ?? null;
}
