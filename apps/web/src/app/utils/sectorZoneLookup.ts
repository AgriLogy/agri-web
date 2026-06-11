import { pointInPolygon } from '@/app/utils/pointInPolygon';

export function findContainingSector(
  lon: number,
  lat: number,
  features: GeoJSON.Feature[]
): { zoneId: string; zoneName: string } | null {
  const pt: [number, number] = [lon, lat];
  for (const f of features) {
    const g = f.geometry;
    if (g.type === 'Polygon') {
      const ring = g.coordinates[0];
      if (ring?.length && pointInPolygon(pt, ring)) {
        return {
          zoneId: f.id != null ? String(f.id) : '',
          zoneName:
            f.properties &&
            typeof (f.properties as { name?: string }).name === 'string' &&
            (f.properties as { name: string }).name
              ? (f.properties as { name: string }).name
              : 'Secteur',
        };
      }
    } else if (g.type === 'MultiPolygon') {
      for (const poly of g.coordinates) {
        const ring = poly[0];
        if (ring?.length && pointInPolygon(pt, ring)) {
          return {
            zoneId: f.id != null ? String(f.id) : '',
            zoneName:
              f.properties &&
              typeof (f.properties as { name?: string }).name === 'string' &&
              (f.properties as { name: string }).name
                ? (f.properties as { name: string }).name
                : 'Secteur',
          };
        }
      }
    }
  }
  return null;
}
