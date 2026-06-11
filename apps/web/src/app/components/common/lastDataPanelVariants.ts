/**
 * Styling for the "latest reading" side-panels.
 *
 * Unified to the brand-green palette (modifications #2): the old per-sensor
 * multi-colour tints — especially the blue ones — read as off-brand, most
 * visibly in dark mode. Every variant now resolves to the same brand style.
 */
export type LastDataPanelVariant =
  | 'waterSoil'
  | 'vpd'
  | 'windRadar'
  | 'windSpeed'
  | 'npk'
  | 'fruiteSize'
  | 'tempHumidity'
  | 'waterPressure'
  | 'phWater'
  | 'waterFlow'
  | 'ecWater'
  | 'solarRadiation'
  | 'et0'
  | 'cumulPrecipitation'
  | 'precipitationRate'
  | 'largeFruitDiameter'
  | 'electricity'
  | 'phSoil'
  | 'soilSalinity'
  | 'soilTemperature'
  | 'soilConductivity'
  | 'sensorLeaf';

type PanelStyle = {
  bgLight: string;
  bgDark: string;
  borderLightTok: string;
  borderDarkTok: string;
};

const BRAND_PANEL: PanelStyle = {
  bgLight: 'brand.50',
  bgDark: 'rgba(31, 119, 64, 0.2)', // brand 600 (#1f7740) @ 20%
  borderLightTok: 'brand.200',
  borderDarkTok: 'brand.400',
};

const VARIANTS: LastDataPanelVariant[] = [
  'waterSoil',
  'vpd',
  'windRadar',
  'windSpeed',
  'npk',
  'fruiteSize',
  'tempHumidity',
  'waterPressure',
  'phWater',
  'waterFlow',
  'ecWater',
  'solarRadiation',
  'et0',
  'cumulPrecipitation',
  'precipitationRate',
  'largeFruitDiameter',
  'electricity',
  'phSoil',
  'soilSalinity',
  'soilTemperature',
  'soilConductivity',
  'sensorLeaf',
];

export const LAST_DATA_VARIANT_STYLES = Object.fromEntries(
  VARIANTS.map((v) => [v, BRAND_PANEL])
) as Record<LastDataPanelVariant, PanelStyle>;
