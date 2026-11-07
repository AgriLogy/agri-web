import { pointInPolygon } from './pointInPolygon';
import { findContainingSector } from './sectorZoneLookup';

const square = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
  [0, 0],
];

describe('pointInPolygon', () => {
  it('finds points inside and outside a ring', () => {
    expect(pointInPolygon([5, 5], square)).toBe(true);
    expect(pointInPolygon([15, 5], square)).toBe(false);
  });

  it('ignores empty vertices of a polygon still being drawn', () => {
    // mapbox-gl-draw's in-progress polygon after the first click.
    expect(pointInPolygon([5, 5], [[1, 1], null, undefined])).toBe(false);
    expect(pointInPolygon([5, 5], [null])).toBe(false);
    expect(pointInPolygon([5, 5], [])).toBe(false);
    expect(pointInPolygon([5, 5], [...square.slice(0, 4), null])).toBe(true);
  });
});

describe('findContainingSector', () => {
  it('does not throw on a sector that is mid-draw', () => {
    const drawing = {
      type: 'Feature',
      id: 'tmp',
      properties: {},
      geometry: { type: 'Polygon', coordinates: [[[1, 1], null]] },
    } as unknown as GeoJSON.Feature;
    const done = {
      type: 'Feature',
      id: 's1',
      properties: { name: 'Secteur 1' },
      geometry: { type: 'Polygon', coordinates: [square] },
    } as GeoJSON.Feature;
    expect(() => findContainingSector(5, 5, [drawing])).not.toThrow();
    expect(findContainingSector(5, 5, [drawing, done])).toEqual({
      zoneId: 's1',
      zoneName: 'Secteur 1',
    });
  });
});
