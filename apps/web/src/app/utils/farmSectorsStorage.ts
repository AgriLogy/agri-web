const STORAGE_KEY = 'agrilogy-farm-sectors-v1';

export type FarmSectorFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  { id?: string; name: string; color?: string }
>;

export function loadFarmSectors(): FarmSectorFeatureCollection | null {
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
      return parsed as FarmSectorFeatureCollection;
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveFarmSectors(fc: FarmSectorFeatureCollection): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fc));
}
