/**
 * Unit tests for the NDVI phase 3 wrappers in `farmMapApi` (agri-api#459):
 * URL, query params and multipart body each endpoint of the contract expects.
 * axios is mocked; nothing hits a server.
 */
import { farmMapApi } from '@agri/api-client/farmMapApi';

jest.mock('@agri/api-client/api', () => {
  const get = jest.fn();
  const post = jest.fn();
  return { __esModule: true, default: { get, post }, get, post };
});

import api from '@agri/api-client/api';

const mocked = api as unknown as { get: jest.Mock; post: jest.Mock };

beforeEach(() => {
  mocked.get.mockReset();
  mocked.post.mockReset();
});

it('sectorInsights → GET /farm-map/sectors/{id}/insights', async () => {
  mocked.get.mockResolvedValue({ data: { sector_id: 3 } });
  await expect(farmMapApi.sectorInsights(3)).resolves.toEqual({
    sector_id: 3,
  });
  expect(mocked.get).toHaveBeenCalledWith('/farm-map/sectors/3/insights');
});

it.each(['fr', 'ar', 'en'] as const)(
  'sectorInsights(id, %s) → ?lang=%s',
  async (lang) => {
    mocked.get.mockResolvedValue({ data: { sector_id: 3, lang } });
    await expect(farmMapApi.sectorInsights(3, lang)).resolves.toEqual({
      sector_id: 3,
      lang,
    });
    expect(mocked.get).toHaveBeenCalledWith('/farm-map/sectors/3/insights', {
      params: { lang },
    });
  }
);

it('forecast → GET /farm-map/forecast?days=N (default 3)', async () => {
  mocked.get.mockResolvedValue({ data: { provider: 'mock' } });
  await farmMapApi.forecast(7);
  expect(mocked.get).toHaveBeenCalledWith('/farm-map/forecast', {
    params: { days: 7 },
  });
  await farmMapApi.forecast();
  expect(mocked.get).toHaveBeenLastCalledWith('/farm-map/forecast', {
    params: { days: 3 },
  });
});

it('ndviHistory → GET …/history?index=…&days=365', async () => {
  mocked.get.mockResolvedValue({ data: { series: [] } });
  await farmMapApi.ndviHistory(5, 'ndmi');
  expect(mocked.get).toHaveBeenCalledWith('/farm-map/ndvi/sectors/5/history', {
    params: { index: 'ndmi', days: 365 },
  });
});

it('geometryHistory unwraps revisions; restore POSTs the revision', async () => {
  mocked.get.mockResolvedValue({
    data: { sector_id: 3, revisions: [{ id: 12 }] },
  });
  await expect(farmMapApi.geometryHistory(3)).resolves.toEqual([{ id: 12 }]);
  expect(mocked.get).toHaveBeenCalledWith('/sectors/3/geometry-history');

  mocked.post.mockResolvedValue({ data: { id: 3, name: 'A' } });
  await expect(farmMapApi.restoreGeometry(3, 12)).resolves.toEqual({
    id: 3,
    name: 'A',
  });
  expect(mocked.post).toHaveBeenCalledWith(
    '/sectors/3/geometry-history/12/restore'
  );
});

it('importKml sends multipart file + dry_run as "true"/"false"', async () => {
  mocked.post.mockResolvedValue({
    data: { dry_run: true, sectors: [], skipped: [] },
  });
  const file = new File(['<kml/>'], 'farm.kml');
  await farmMapApi.importKml(file, true);
  await farmMapApi.importKml(file, false);
  const [url, form] = mocked.post.mock.calls[0] as [string, FormData];
  expect(url).toBe('/farm-map/sectors/import-kml');
  expect(form).toBeInstanceOf(FormData);
  expect((form.get('file') as File).name).toBe('farm.kml');
  expect(form.get('dry_run')).toBe('true');
  expect((mocked.post.mock.calls[1]![1] as FormData).get('dry_run')).toBe(
    'false'
  );
});
