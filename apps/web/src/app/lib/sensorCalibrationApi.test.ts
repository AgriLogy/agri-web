/**
 * UNIT tests for the `/sensor-calibrations` axios wrapper (agri-web #97).
 *
 * No rendering: axios is mocked and we assert the URL + payload shape the
 * agri-api router expects (agri-api #440), plus the availability probe's
 * verdicts.
 */
import { sensorCalibrationApi } from '@agri/api-client/sensorCalibrationApi';

jest.mock('@agri/api-client/api', () => {
  const get = jest.fn();
  const put = jest.fn();
  return {
    __esModule: true,
    default: { get, put },
    get,
    put,
  };
});

import api from '@agri/api-client/api';

const mocked = api as unknown as { get: jest.Mock; put: jest.Mock };

const migrationRefusal = {
  response: {
    status: 400,
    data: {
      detail:
        'Sensor calibration is not available on this deployment: ' +
        'analytics_sensorcalibration does not exist. Apply the agri-db ' +
        'migration that creates it (f4b6d2e8c1a9), then retry.',
    },
  },
};

beforeEach(() => {
  mocked.get.mockReset();
  mocked.put.mockReset();
});

describe('sensorCalibrationApi — URL shape', () => {
  it('reads one sensor by the (device_id, sensor_key) pair', async () => {
    mocked.get.mockResolvedValue({ data: { configured: false } });
    await sensorCalibrationApi.get(10, 'soil_temperature');
    expect(mocked.get).toHaveBeenCalledWith(
      '/sensor-calibrations/10/soil_temperature'
    );
  });

  it('escapes a sensor key so it cannot break out of the path', async () => {
    mocked.get.mockResolvedValue({ data: {} });
    await sensorCalibrationApi.get(10, 'weird/key');
    expect(mocked.get).toHaveBeenCalledWith(
      '/sensor-calibrations/10/weird%2Fkey'
    );
  });

  it('upserts with PUT and the full row payload', async () => {
    mocked.put.mockResolvedValue({ data: { configured: true } });
    await sensorCalibrationApi.save(20, 'soil_ph', {
      scale_a: 1.02,
      offset_b: -0.1,
      unit: 'pH',
      is_active: true,
      note: 'ref probe',
    });
    expect(mocked.put).toHaveBeenCalledWith('/sensor-calibrations/20/soil_ph', {
      scale_a: 1.02,
      offset_b: -0.1,
      unit: 'pH',
      is_active: true,
      note: 'ref probe',
    });
  });
});

describe('sensorCalibrationApi.probeAvailability', () => {
  it('is a READ, so probing can never write anything', async () => {
    mocked.get.mockResolvedValue({ data: { configured: false } });
    await sensorCalibrationApi.probeAvailability(10, 'soil_temperature');
    expect(mocked.get).toHaveBeenCalledWith(
      '/sensor-calibrations/10/soil_temperature'
    );
    expect(mocked.put).not.toHaveBeenCalled();
  });

  it('a default answer means the table is there', async () => {
    mocked.get.mockResolvedValue({ data: { configured: false } });
    await expect(
      sensorCalibrationApi.probeAvailability(10, 'soil_temperature')
    ).resolves.toBe('available');
  });

  it('the 400 naming the migration means it is NOT', async () => {
    mocked.get.mockRejectedValue(migrationRefusal);
    await expect(
      sensorCalibrationApi.probeAvailability(10, 'soil_temperature')
    ).resolves.toBe('unavailable');
  });

  it('a 404 still proves the router (and the table) exist', async () => {
    mocked.get.mockRejectedValue({ response: { status: 404 } });
    await expect(
      sensorCalibrationApi.probeAvailability(10, 'soil_temperature')
    ).resolves.toBe('available');
  });

  it('a network failure stays "unknown" — the backend is not accused', async () => {
    mocked.get.mockRejectedValue(new Error('offline'));
    await expect(
      sensorCalibrationApi.probeAvailability(10, 'soil_temperature')
    ).resolves.toBe('unknown');
    mocked.get.mockRejectedValue({ response: { status: 502 } });
    await expect(
      sensorCalibrationApi.probeAvailability(10, 'soil_temperature')
    ).resolves.toBe('unknown');
  });
});
