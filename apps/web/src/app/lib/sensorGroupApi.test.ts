/**
 * Unit tests for the `/sensor-groups` axios wrapper (agri-web #95).
 *
 * No rendering: axios is mocked and we assert the URL + payload shape the
 * agri-api router expects, plus the availability probe's verdicts.
 */
import { sensorGroupApi } from '@agri/api-client/sensorGroupApi';

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

const migrationRefusal = {
  response: {
    status: 400,
    data: {
      detail:
        'Sensor groups are not available on this deployment: ' +
        'analytics_sensorgroup does not exist. Apply the agri-db migration ' +
        'that creates it (f4b6d2e8c1a9), then retry.',
    },
  },
};

beforeEach(() => {
  mocked.get.mockReset();
  mocked.post.mockReset();
  mocked.patch.mockReset();
  mocked.delete.mockReset();
});

describe('sensorGroupApi CRUD shaping', () => {
  it('lists groups from GET /sensor-groups and unwraps data', async () => {
    mocked.get.mockResolvedValue({ data: [{ id: 1, name: 'Serre A' }] });
    await expect(sensorGroupApi.list()).resolves.toEqual([
      { id: 1, name: 'Serre A' },
    ]);
    expect(mocked.get).toHaveBeenCalledWith('/sensor-groups');
  });

  it('creates with the server-side field names', async () => {
    mocked.post.mockResolvedValue({ data: { id: 3 } });
    await sensorGroupApi.create({ name: 'Irrigation', display_order: 2 });
    expect(mocked.post).toHaveBeenCalledWith('/sensor-groups', {
      name: 'Irrigation',
      display_order: 2,
    });
  });

  it('renames through PATCH on the group id', async () => {
    mocked.patch.mockResolvedValue({ data: { id: 3, name: 'Neuf' } });
    await sensorGroupApi.update(3, { name: 'Neuf' });
    expect(mocked.patch).toHaveBeenCalledWith('/sensor-groups/3', {
      name: 'Neuf',
    });
  });

  it('deletes the group, not its devices', async () => {
    mocked.delete.mockResolvedValue({ data: { success: true } });
    await sensorGroupApi.remove(3);
    expect(mocked.delete).toHaveBeenCalledWith('/sensor-groups/3');
  });

  it('adds a membership as the (device_id, sensor_key) pair', async () => {
    mocked.post.mockResolvedValue({ data: { id: 77 } });
    const row = await sensorGroupApi.addSensor(3, {
      device_id: 10,
      sensor_key: 'soil_temperature',
      zone_id: 5,
    });
    expect(mocked.post).toHaveBeenCalledWith('/sensor-groups/3/sensors', {
      device_id: 10,
      sensor_key: 'soil_temperature',
      zone_id: 5,
    });
    expect(row).toEqual({ id: 77 });
  });

  it('removes a membership by its own id, scoped to the group', async () => {
    mocked.delete.mockResolvedValue({ data: { success: true } });
    await sensorGroupApi.removeSensor(3, 77);
    expect(mocked.delete).toHaveBeenCalledWith('/sensor-groups/3/sensors/77');
  });

  it('lets a real error through instead of swallowing it', async () => {
    mocked.post.mockRejectedValue(migrationRefusal);
    await expect(sensorGroupApi.create({ name: 'x' })).rejects.toBe(
      migrationRefusal
    );
  });
});

describe('sensorGroupApi.probeAvailability', () => {
  it('probes without writing anything: PATCH on a group id that never exists', async () => {
    mocked.patch.mockRejectedValue({
      response: { status: 404, data: { detail: 'Sensor group not found.' } },
    });
    await expect(sensorGroupApi.probeAvailability()).resolves.toBe('available');
    expect(mocked.patch).toHaveBeenCalledWith('/sensor-groups/0', {});
    expect(mocked.post).not.toHaveBeenCalled();
    expect(mocked.delete).not.toHaveBeenCalled();
  });

  it('reports unavailable when the reply names the held migration', async () => {
    mocked.patch.mockRejectedValue(migrationRefusal);
    await expect(sensorGroupApi.probeAvailability()).resolves.toBe(
      'unavailable'
    );
  });

  it('treats a read-only (technician) 403 as available', async () => {
    mocked.patch.mockRejectedValue({
      response: {
        status: 403,
        data: { detail: 'Read-only (technician) access.' },
      },
    });
    await expect(sensorGroupApi.probeAvailability()).resolves.toBe('available');
  });

  it('treats an unrelated 400 as available — the router answered', async () => {
    mocked.patch.mockRejectedValue({
      response: { status: 400, data: { detail: 'name is required.' } },
    });
    await expect(sensorGroupApi.probeAvailability()).resolves.toBe('available');
  });

  it('stays unknown when the request never reached the API', async () => {
    mocked.patch.mockRejectedValue(new Error('Network Error'));
    await expect(sensorGroupApi.probeAvailability()).resolves.toBe('unknown');
  });
});
