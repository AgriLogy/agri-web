import {
  apiDetail,
  checkKmlFile,
  createdIds,
  httpStatus,
  KML_MAX_BYTES,
  previewTotalArea,
  sortRevisions,
} from './kmlImport';

describe('checkKmlFile', () => {
  it('accepts .kml and .kmz up to 2 MB', () => {
    expect(checkKmlFile({ name: 'farm.kml', size: 10 })).toBeNull();
    expect(checkKmlFile({ name: 'FARM.KMZ', size: KML_MAX_BYTES })).toBeNull();
  });
  it('rejects other extensions, empty and oversized files', () => {
    expect(checkKmlFile({ name: 'farm.geojson', size: 10 })).toBe(
      'bad_extension'
    );
    expect(checkKmlFile({ name: 'farm.kml', size: 0 })).toBe('empty');
    expect(checkKmlFile({ name: 'farm.kml', size: KML_MAX_BYTES + 1 })).toBe(
      'too_large'
    );
  });
});

const result = {
  dry_run: false,
  sectors: [
    { name: 'A', area_ha: 2.1, perimeter_m: 640, geometry: null, id: 7 },
    { name: 'B', area_ha: null, perimeter_m: null, geometry: null, id: null },
    { name: 'C', area_ha: 0.333, perimeter_m: 1, geometry: null, id: 8 },
  ],
  skipped: [{ name: 'Point 1', reason: 'not_a_polygon' }],
};

it('previewTotalArea sums known areas, null when none', () => {
  expect(previewTotalArea(result)).toBe(2.43);
  expect(previewTotalArea({ ...result, sectors: [] })).toBeNull();
});

it('createdIds keeps filled ids', () => {
  expect(createdIds(result)).toEqual([7, 8]);
});

it('apiDetail / httpStatus read axios errors defensively', () => {
  const e = { response: { status: 400, data: { detail: 'Bad KML' } } };
  expect(apiDetail(e)).toBe('Bad KML');
  expect(httpStatus(e)).toBe(400);
  expect(apiDetail(new Error('x'))).toBeNull();
  expect(httpStatus(undefined)).toBeNull();
});

it('sortRevisions puts the newest first', () => {
  const rev = (id: number, created_at: string) => ({
    id,
    created_at,
    source: 'draw',
    area_ha: 1,
    perimeter_m: 1,
    geometry: null,
  });
  expect(
    sortRevisions([
      rev(1, '2026-11-01T00:00:00Z'),
      rev(2, '2026-11-20T00:00:00Z'),
    ]).map((r) => r.id)
  ).toEqual([2, 1]);
});
