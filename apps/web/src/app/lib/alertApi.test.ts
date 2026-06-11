/**
 * Behaviour tests for the alertApi axios wrapper.
 *
 * These intentionally do NOT exercise rendering — we mock axios and
 * assert the wrapper hits the right URL with the right shape.
 */

import { alertApi } from '@agri/api-client/alertApi';

jest.mock('@agri/api-client/api', () => {
  const get = jest.fn();
  const post = jest.fn();
  const patch = jest.fn();
  const del = jest.fn();
  return {
    __esModule: true,
    default: { get, post, patch, delete: del },
    get,
    post,
    patch,
    delete: del,
  };
});

import api from '@agri/api-client/api';

const mocked = api as unknown as {
  get: jest.Mock;
  post: jest.Mock;
  patch: jest.Mock;
  delete: jest.Mock;
};

beforeEach(() => {
  mocked.get.mockReset();
  mocked.post.mockReset();
  mocked.patch.mockReset();
  mocked.delete.mockReset();
});

describe('alertApi.list', () => {
  it('hits /alerts/ with params', async () => {
    mocked.get.mockResolvedValueOnce({ data: [] });
    await alertApi.list({ sensor_key: 'temperature_weather' });
    expect(mocked.get).toHaveBeenCalledWith('/alerts', {
      params: { sensor_key: 'temperature_weather' },
    });
  });
});

describe('alertApi.create', () => {
  it('posts to /alerts/ with the write payload', async () => {
    mocked.post.mockResolvedValueOnce({ data: { id: 1 } });
    const payload = {
      name: 'Heat',
      type: 'Weather Temperature',
      condition: '>' as const,
      condition_nbr: 30,
      sensor_key: 'temperature_weather',
      is_active: true,
    };
    await alertApi.create(payload);
    expect(mocked.post).toHaveBeenCalledWith('/alerts', payload);
  });
});

describe('alertApi.update', () => {
  it('patches the detail URL', async () => {
    mocked.patch.mockResolvedValueOnce({ data: { id: 7 } });
    await alertApi.update(7, { is_active: false });
    expect(mocked.patch).toHaveBeenCalledWith('/alerts/7', {
      is_active: false,
    });
  });
});

describe('alertApi.remove', () => {
  it('deletes by id', async () => {
    mocked.delete.mockResolvedValueOnce({ data: undefined });
    await alertApi.remove(99);
    expect(mocked.delete).toHaveBeenCalledWith('/alerts/99');
  });
});

describe('alertApi.forGraph', () => {
  it('unwraps the alerts array', async () => {
    mocked.get.mockResolvedValueOnce({
      data: { alerts: [{ id: 1, threshold: 30 }] },
    });
    const out = await alertApi.forGraph({
      sensor_key: 'temperature_weather',
      zone_id: 5,
    });
    expect(out).toEqual([{ id: 1, threshold: 30 }]);
    expect(mocked.get).toHaveBeenCalledWith('/alerts/for-graph', {
      params: { sensor_key: 'temperature_weather', zone_id: 5 },
    });
  });
});

describe('alertApi.sensorKeys', () => {
  it('unwraps the keys array', async () => {
    mocked.get.mockResolvedValueOnce({
      data: {
        keys: [{ key: 'temperature_weather', label: 'Air', unit: '°C' }],
      },
    });
    const out = await alertApi.sensorKeys();
    expect(out).toEqual([
      { key: 'temperature_weather', label: 'Air', unit: '°C' },
    ]);
  });
});
