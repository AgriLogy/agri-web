/**
 * i18n: `value` stays the stable backend value (sent to / received from the
 * API). `label` is the French fallback. For UI, translate via the shared
 * catalog using `i18nKey`: `t('conditions.' + i18nKey)`.
 */
export const CONDITION_CHOICES = [
  { value: '>', label: 'Supérieur à', i18nKey: 'gt' },
  { value: '<', label: 'Inférieur à', i18nKey: 'lt' },
  { value: '=', label: 'Égal à', i18nKey: 'eq' },
];

/**
 * i18n: `value` is the stable backend alert type. `label` is the French
 * fallback. For UI, translate via `t('alertTypes.' + i18nKey)`.
 */
export const ALERT_CHOICES = [
  { value: 'Pressure', label: 'Pression', i18nKey: 'pressure' },
  { value: 'Flow', label: 'Débit', i18nKey: 'flow' },
  {
    value: 'Weather Temperature',
    label: "Température de l'air",
    i18nKey: 'weatherTemperature',
  },
  { value: 'Wind Speed', label: 'Vitesse du vent', i18nKey: 'windSpeed' },
  { value: 'Rain Fall', label: 'Pluie', i18nKey: 'rainFall' },
  {
    value: 'Periodic maintenance',
    label: 'Maintenance périodique',
    i18nKey: 'periodicMaintenance',
  },
  {
    value: 'EC (Electrical Conductivity)',
    label: 'Conductivité électrique',
    i18nKey: 'ec',
  },
  { value: 'pH Level', label: 'Niveau de pH', i18nKey: 'ph' },
  { value: 'Humidity', label: 'Humidité', i18nKey: 'humidity' },
  {
    value: 'Soil Temperature',
    label: 'Température du sol',
    i18nKey: 'soilTemperature',
  },
];

export interface SensorKeyOption {
  key: string;
  label: string;
  unit: string;
}

// Mirror of analytics.alerts.SENSOR_KEY_REGISTRY on the backend. Used as
// the fallback before /sensors resolves so the form
// never renders an empty Select on first paint.
//
// i18n: each `key` doubles as the shared sensor translation key — render the
// name with `t('sensors.' + opt.key)`. `label` stays the French fallback.
export const DEFAULT_SENSOR_KEYS: SensorKeyOption[] = [
  { key: 'temperature_weather', label: "Température de l'air", unit: '°C' },
  { key: 'humidity_weather', label: "Humidité de l'air", unit: '%' },
  { key: 'wind_speed', label: 'Vitesse du vent', unit: 'm/s' },
  { key: 'solar_radiation', label: 'Rayonnement solaire', unit: 'W/m²' },
  { key: 'pressure_weather', label: 'Pression atmosphérique', unit: 'hPa' },
  { key: 'precipitation_rate', label: 'Précipitations', unit: 'mm/h' },
  { key: 'et0', label: 'ET₀', unit: 'mm/h' },
  { key: 'vpd', label: 'Déficit de pression de vapeur (DPV)', unit: 'kPa' },
  { key: 'soil_moisture_medium', label: 'Humidité du sol', unit: '%' },
  { key: 'soil_temperature_medium', label: 'Température du sol', unit: '°C' },
  { key: 'soil_ph', label: 'pH du sol', unit: 'pH' },
  { key: 'water_flow', label: "Débit d'eau", unit: 'm³/h' },
  { key: 'water_pressure', label: "Pression d'eau", unit: 'bar' },
];
