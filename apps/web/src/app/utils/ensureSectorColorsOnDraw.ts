import { colorForSectorIndex, isHexColor } from '@/app/utils/sectorColors';

type DrawLike = {
  getAll: () => GeoJSON.FeatureCollection;
  setFeatureProperty: (
    featureId: string,
    property: string,
    value: string
  ) => unknown;
};

export function ensureSectorColorsOnDraw(draw: DrawLike): void {
  const polys = draw
    .getAll()
    .features.filter(
      (f) => f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'
    );
  polys.forEach((f, i) => {
    const id = f.id != null ? String(f.id) : '';
    if (!id) return;
    const c = f.properties && (f.properties as { color?: unknown }).color;
    if (!isHexColor(c)) {
      draw.setFeatureProperty(id, 'color', colorForSectorIndex(i));
    }
  });
}
