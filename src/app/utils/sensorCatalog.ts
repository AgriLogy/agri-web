/**
 * i18n: `key` doubles as the shared sensor translation key. Render the
 * user-facing name with `t('sensors.' + item.key)` (root `useTranslations()`).
 * `readingLabel` / `typeLabel` remain French fallbacks for non-React consumers
 * (Réglages selectors, SSR, tests); do NOT translate via those fields.
 */
export type SensorCatalogItem = {
  key: string;
  readingLabel: string;
  typeLabel: string;
  defaultUnit: string;
  category: 'lecture' | 'sensor';
};

const CUSTOM_SENSORS_KEY = 'customSensorsCatalog';

/**
 * Unités par défaut alignées sur le PDF
 * `change.the.unite.of.sensors.from.paramtere.user.1.3.pdf` ( PARAMETERAGE ).
 * Si l’API renvoie une autre unité, l’utilisateur peut ajuster via Réglages → Lectures.
 */
export const SENSOR_CATALOG: SensorCatalogItem[] = [
  {
    key: 'solar_radiation',
    readingLabel: 'Rayonnement',
    typeLabel: 'Rayonnement',
    defaultUnit: 'W/m²',
    category: 'lecture',
  },
  {
    key: 'temperature_weather',
    readingLabel: 'Température',
    typeLabel: 'Température',
    defaultUnit: '°C',
    category: 'lecture',
  },
  {
    key: 'humidity_weather',
    readingLabel: 'Humidité',
    typeLabel: 'Humidité',
    defaultUnit: '%',
    category: 'lecture',
  },
  {
    key: 'pressure_weather',
    readingLabel: 'Pression atmosphérique',
    typeLabel: 'Météo',
    defaultUnit: 'hPa',
    category: 'lecture',
  },
  {
    key: 'wind_speed',
    readingLabel: 'Vitesse du vent',
    typeLabel: 'Vitesse du vent',
    defaultUnit: 'm/s',
    category: 'lecture',
  },
  {
    key: 'wind_gust',
    readingLabel: 'Vitesse de rafale',
    typeLabel: 'Vitesse de rafale',
    defaultUnit: 'm/s',
    category: 'lecture',
  },
  {
    key: 'wind_direction',
    readingLabel: 'Direction du vent',
    typeLabel: 'Direction du vent',
    defaultUnit: '°',
    category: 'lecture',
  },
  {
    key: 'et0',
    readingLabel: 'Évapotranspiration de référence (horaire)',
    typeLabel: 'Évapotranspiration ET₀',
    defaultUnit: 'mm/h',
    category: 'lecture',
  },
  {
    key: 'vpd',
    readingLabel: 'Déficit de pression de vapeur',
    typeLabel: 'VPD',
    defaultUnit: 'kPa',
    category: 'lecture',
  },
  {
    key: 'precipitation_rate',
    readingLabel: 'Précipitation',
    typeLabel: 'Taux de précipitation',
    defaultUnit: 'mm/h',
    category: 'lecture',
  },
  // PDF « mm » = cumul ; ici l’app suit le taux (mm/h) côté API.
  {
    key: 'water_flow',
    readingLabel: 'Irrigation',
    typeLabel: 'Irrigation',
    defaultUnit: 'm³/h',
    category: 'lecture',
  },
  {
    key: 'irrigation_cumulative',
    readingLabel: 'Irrigation cumulée',
    typeLabel: 'Irrigation',
    defaultUnit: 'm³/ha',
    category: 'lecture',
  },
  {
    key: 'water_level',
    readingLabel: "Niveau d'eau",
    typeLabel: 'Eau',
    defaultUnit: 'm',
    category: 'lecture',
  },
  {
    key: 'water_pressure',
    readingLabel: "Pression d'eau",
    typeLabel: 'Pression',
    defaultUnit: 'kPa',
    category: 'lecture',
  },
  {
    key: 'water_ph',
    readingLabel: "pH de l'eau",
    typeLabel: 'pH eau',
    defaultUnit: 'pH',
    category: 'lecture',
  },
  {
    key: 'water_ec',
    readingLabel: "Conductivité de l'eau",
    typeLabel: 'EC eau',
    defaultUnit: 'µS/cm',
    category: 'lecture',
  },
  {
    key: 'soil_moisture_low',
    readingLabel: 'Humidité sol bas',
    typeLabel: 'Humidité sol',
    defaultUnit: '%',
    category: 'lecture',
  },
  {
    key: 'soil_moisture_medium',
    readingLabel: 'Humidité sol moyen',
    typeLabel: 'Humidité sol',
    defaultUnit: '%',
    category: 'lecture',
  },
  {
    key: 'soil_moisture_high',
    readingLabel: 'Humidité sol haut',
    typeLabel: 'Humidité sol',
    defaultUnit: '%',
    category: 'lecture',
  },
  {
    key: 'soil_temp_low',
    readingLabel: 'Température sol basse',
    typeLabel: 'Température sol',
    defaultUnit: '°C',
    category: 'lecture',
  },
  {
    key: 'soil_temp_medium',
    readingLabel: 'Température sol moyenne',
    typeLabel: 'Température sol',
    defaultUnit: '°C',
    category: 'lecture',
  },
  {
    key: 'soil_temp_high',
    readingLabel: 'Température sol haute',
    typeLabel: 'Température sol',
    defaultUnit: '°C',
    category: 'lecture',
  },
  {
    key: 'soil_ph',
    readingLabel: 'pH sol',
    typeLabel: 'pH sol',
    defaultUnit: 'pH',
    category: 'lecture',
  },
  {
    key: 'soil_salinity',
    readingLabel: 'Salinité sol',
    typeLabel: 'Salinité',
    defaultUnit: 'mg/l',
    category: 'lecture',
  },
  {
    key: 'soil_conductivity',
    readingLabel: 'Conductivité sol',
    typeLabel: 'Conductivité sol',
    defaultUnit: 'µS/cm',
    category: 'lecture',
  },
  {
    key: 'leaf_temperature',
    readingLabel: 'Température feuille',
    typeLabel: 'Feuille',
    defaultUnit: '°C',
    category: 'lecture',
  },
  {
    key: 'leaf_moisture',
    readingLabel: 'Humidité feuille',
    typeLabel: 'Feuille',
    defaultUnit: '%',
    category: 'lecture',
  },
  {
    key: 'npk_n',
    readingLabel: 'Azote (N)',
    typeLabel: 'NPK',
    defaultUnit: 'mg/kg',
    category: 'lecture',
  },
  {
    key: 'npk_p',
    readingLabel: 'Phosphore (P)',
    typeLabel: 'NPK',
    defaultUnit: 'mg/kg',
    category: 'lecture',
  },
  {
    key: 'npk_k',
    readingLabel: 'Potassium (K)',
    typeLabel: 'NPK',
    defaultUnit: 'mg/kg',
    category: 'lecture',
  },
  {
    key: 'fruit_size',
    readingLabel: 'Taille des fruits',
    typeLabel: 'Fruit',
    defaultUnit: 'mm',
    category: 'lecture',
  },
  {
    key: 'large_fruit_diameter',
    readingLabel: 'Diamètre des fruits',
    typeLabel: 'Fruit',
    defaultUnit: 'mm',
    category: 'lecture',
  },
  {
    key: 'electricity_consumption',
    readingLabel: 'Consommation électrique',
    typeLabel: 'Électricité',
    defaultUnit: 'Wh',
    category: 'lecture',
  },
];

export function getCustomSensorsCatalog(): SensorCatalogItem[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(CUSTOM_SENSORS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SensorCatalogItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s) =>
        typeof s.key === 'string' &&
        typeof s.readingLabel === 'string' &&
        typeof s.typeLabel === 'string' &&
        typeof s.defaultUnit === 'string'
    );
  } catch {
    return [];
  }
}

export function saveCustomSensorsCatalog(rows: SensorCatalogItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CUSTOM_SENSORS_KEY, JSON.stringify(rows));
}

export function getAllSensorsCatalog(
  includeCustom = true
): SensorCatalogItem[] {
  const custom = includeCustom ? getCustomSensorsCatalog() : [];
  const map = new Map<string, SensorCatalogItem>();
  for (const row of SENSOR_CATALOG) map.set(row.key, row);
  for (const row of custom) map.set(row.key, row);
  return Array.from(map.values());
}

/** Default unit for a sensor key (base + custom catalogue). Empty if unknown. */
export function getCatalogDefaultUnit(sensorKey: string): string {
  const item = getAllSensorsCatalog(true).find((s) => s.key === sensorKey);
  return item?.defaultUnit?.trim() ?? '';
}

/** Unités usuelles en complément des `defaultUnit` du catalogue (sélecteurs réglages). */
const ADDITIONAL_UNIT_SUGGESTIONS: string[] = [
  '°F',
  'K',
  'm/s',
  'mph',
  'm³/h',
  'L/h',
  'L/min',
  'mL/min',
  'hPa',
  'kPa',
  'MPa',
  'Pa',
  'dS/m',
  'mS/cm',
  'ppt',
  'µg/m³',
  'mg/m³',
  'lux',
  'mol/m²/s',
  'J/cm²',
  'MJ/m²',
  'Wh',
  'cm',
  'm',
  'm³/ha',
  'L/ha',
  'km',
  't/ha',
  'kg/ha',
  'g/L',
  'g/kg',
  'ppm',
  'ppb',
  '—',
];

function sortFr(a: string, b: string) {
  return a.localeCompare(b, 'fr', { sensitivity: 'base' });
}

/** Tous les libellés de lecture (noms côté capteurs / catalogue), triés. */
export function getReadingLabelOptions(includeCustom = true): string[] {
  const seen = new Set<string>();
  for (const item of getAllSensorsCatalog(includeCustom)) {
    const v = item.readingLabel.trim();
    if (v) seen.add(v);
  }
  return [...seen].sort(sortFr);
}

/** Tous les types (libellé type) du catalogue, triés. */
export function getTypeLabelOptions(includeCustom = true): string[] {
  const seen = new Set<string>();
  for (const item of getAllSensorsCatalog(includeCustom)) {
    const v = item.typeLabel.trim();
    if (v) seen.add(v);
  }
  return [...seen].sort(sortFr);
}

/** Unités : catalogue + suggestions courantes. */
export function getUnitSelectOptions(includeCustom = true): string[] {
  const seen = new Set<string>();
  for (const item of getAllSensorsCatalog(includeCustom)) {
    const v = item.defaultUnit.trim();
    if (v) seen.add(v);
  }
  for (const u of ADDITIONAL_UNIT_SUGGESTIONS) seen.add(u);
  return [...seen].sort(sortFr);
}
