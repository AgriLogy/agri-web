import {
  diffSectors,
  isCompleteSectorGeometry,
  sectorFingerprint,
  type SyncedSector,
} from './sectorSync';

const square = (x: number): GeoJSON.Polygon => ({
  type: 'Polygon',
  coordinates: [
    [
      [x, 32],
      [x + 0.01, 32],
      [x + 0.01, 32.01],
      [x, 32.01],
      [x, 32],
    ],
  ],
});

const feat = (
  id: string,
  name: string,
  geometry: GeoJSON.Geometry = square(-7),
  color = '#16a34a'
): GeoJSON.Feature => ({
  type: 'Feature',
  id,
  properties: { name, color },
  geometry,
});

describe('isCompleteSectorGeometry', () => {
  it('accepts closed polygons and multipolygons', () => {
    expect(isCompleteSectorGeometry(square(-7))).toBe(true);
    expect(
      isCompleteSectorGeometry({
        type: 'MultiPolygon',
        coordinates: [square(-7).coordinates, square(-6).coordinates],
      })
    ).toBe(true);
  });

  it('rejects a polygon still being drawn and non-polygons', () => {
    expect(
      isCompleteSectorGeometry({
        type: 'Polygon',
        coordinates: [
          [
            [-7, 32],
            [-7, 32],
          ],
        ],
      })
    ).toBe(false);
    expect(
      isCompleteSectorGeometry({ type: 'Point', coordinates: [0, 0] })
    ).toBe(false);
    expect(isCompleteSectorGeometry(null)).toBe(false);
  });
});

describe('diffSectors', () => {
  it('creates sectors the server has never seen', () => {
    const d = diffSectors([feat('a', 'A')], new Map());
    expect(d.creates).toHaveLength(1);
    expect(d.creates[0].drawId).toBe('a');
    expect(d.creates[0].body.name).toBe('A');
    expect(d.updates).toEqual([]);
    expect(d.deletes).toEqual([]);
  });

  it('skips creates already in flight and incomplete shapes', () => {
    const drawing = feat('b', 'B', {
      type: 'Polygon',
      coordinates: [[[-7, 32]]],
    });
    const d = diffSectors([feat('a', 'A'), drawing], new Map(), new Set(['a']));
    expect(d.creates).toEqual([]);
  });

  it('updates only sectors whose name, colour or shape changed', () => {
    const a = feat('a', 'A');
    const b = feat('b', 'B', square(-6));
    const synced = new Map<string, SyncedSector>([
      ['a', { serverId: 1, fingerprint: sectorFingerprint(a) }],
      ['b', { serverId: 2, fingerprint: sectorFingerprint(b) }],
    ]);
    const renamed = feat('b', 'B renamed', square(-6));
    const d = diffSectors([a, renamed], synced);
    expect(d.updates).toEqual([
      {
        drawId: 'b',
        serverId: 2,
        body: expect.objectContaining({ name: 'B renamed' }),
      },
    ]);
    expect(d.creates).toEqual([]);
  });

  it('deletes sectors removed from the map', () => {
    const a = feat('a', 'A');
    const synced = new Map<string, SyncedSector>([
      ['a', { serverId: 1, fingerprint: sectorFingerprint(a) }],
      ['gone', { serverId: 9, fingerprint: 'x' }],
    ]);
    expect(diffSectors([a], synced).deletes).toEqual([
      { drawId: 'gone', serverId: 9 },
    ]);
  });

  it('defaults a blank name and drops an invalid colour', () => {
    const d = diffSectors([feat('a', '   ', square(-7), 'red')], new Map());
    expect(d.creates[0].body.name).toBe('Secteur');
    expect(d.creates[0].body.color).toBeNull();
  });
});
