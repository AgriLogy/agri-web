const mockGet = jest.fn();
jest.mock('@agri/api-client/api', () => ({
  __esModule: true,
  default: { get: (...a: unknown[]) => mockGet(...a) },
}));

import { fetchLastSensorSample } from './fetchSensorLastValue';

beforeEach(() => mockGet.mockReset());

describe('fetchLastSensorSample (A6)', () => {
  it.each(['wind_gust', 'irrigation_cumulative'])(
    'skips the request for %s, which the API does not serve',
    async (key) => {
      await expect(fetchLastSensorSample(key, 3)).resolves.toBeNull();
      expect(mockGet).not.toHaveBeenCalled();
    }
  );

  it('fetches VPD from /sensors/vpdweather', async () => {
    mockGet.mockResolvedValue({
      data: [{ value: 1.2, default_unit: 'kPa', timestamp: 't' }],
    });
    await expect(fetchLastSensorSample('vpd', 3)).resolves.toEqual({
      rawValue: 1.2,
      defaultUnit: 'kPa',
    });
    expect(mockGet).toHaveBeenCalledWith(
      '/sensors/vpdweather',
      expect.objectContaining({ params: expect.objectContaining({ zone: 3 }) })
    );
  });
});
