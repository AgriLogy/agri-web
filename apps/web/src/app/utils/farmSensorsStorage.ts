const STORAGE_KEY = 'agrilogy-farm-sensors-v1';

export const FARM_SENSORS_SOURCE_ID = 'agrilogy-sensors';
export const FARM_SENSORS_LAYER_ID = 'agrilogy-sensors-symbol';

export type FarmSensorProperties = {
  name: string;
  sensorType: string;
  zoneId?: string;
  zoneName?: string;
};

export type FarmSensorFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  FarmSensorProperties
>;

export function loadFarmSensors(): FarmSensorFeatureCollection | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      (parsed as GeoJSON.FeatureCollection).type === 'FeatureCollection' &&
      Array.isArray((parsed as GeoJSON.FeatureCollection).features)
    ) {
      return parsed as FarmSensorFeatureCollection;
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveFarmSensors(fc: FarmSensorFeatureCollection): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fc));
}
