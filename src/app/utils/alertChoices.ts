export const CONDITION_CHOICES = [
  { value: '>', label: 'Supérieur à' },
  { value: '<', label: 'Inférieur à' },
  { value: '=', label: 'Égal à' },
];

export const ALERT_CHOICES = [
  { value: 'Pressure', label: 'Pression' },
  { value: 'Flow', label: 'Débit' },
  { value: 'Weather Temperature', label: "Température de l'air" },
  { value: 'Wind Speed', label: 'Vitesse du vent' },
  { value: 'Rain Fall', label: 'Pluie' },
  { value: 'Periodic maintenance', label: 'Maintenance périodique' },
  { value: 'EC (Electrical Conductivity)', label: 'Conductivité électrique' },
  { value: 'pH Level', label: 'Niveau de pH' },
  { value: 'Humidity', label: 'Humidité' },
  { value: 'Soil Temperature', label: 'Température du sol' },
];

export interface SensorKeyOption {
  key: string;
  label: string;
  unit: string;
}

// Mirror of analytics.alerts.SENSOR_KEY_REGISTRY on the backend. Used as
// the fallback before /sensors resolves so the form
// never renders an empty Select on first paint.
export const DEFAULT_SENSOR_KEYS: SensorKeyOption[] = [
  { key: 'temperature_weather', label: "Température de l'air", unit: '°C' },
  { key: 'humidity_weather', label: "Humidité de l'air", unit: '%' },
  { key: 'wind_speed', label: 'Vitesse du vent', unit: 'm/s' },
  { key: 'solar_radiation', label: 'Rayonnement solaire', unit: 'W/m²' },
  { key: 'pressure_weather', label: 'Pression atmosphérique', unit: 'hPa' },
  { key: 'precipitation_rate', label: 'Précipitations', unit: 'mm/h' },
  { key: 'et0', label: 'ET₀', unit: 'mm/h' },
  { key: 'soil_moisture_medium', label: 'Humidité du sol', unit: '%' },
  { key: 'soil_temperature_medium', label: 'Température du sol', unit: '°C' },
  { key: 'soil_ph', label: 'pH du sol', unit: 'pH' },
  { key: 'water_flow', label: "Débit d'eau", unit: 'm³/h' },
  { key: 'water_pressure', label: "Pression d'eau", unit: 'bar' },
];
