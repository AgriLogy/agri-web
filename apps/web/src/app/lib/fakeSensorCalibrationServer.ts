/**
 * In-memory stand-in for the agri-api endpoints the calibration editor talks
 * to (`/sensor-calibrations/{device_id}/{sensor_key}`, `/sectors/overview`,
 * `/my-devices`).
 *
 * Mirrors `fakeSensorGroupServer.ts` deliberately — same shape, same
 * `degraded` switch — and reuses its sector/device fixtures so the two
 * features describe the SAME farm. It is faithful on the points the UI must
 * get right:
 *   • a calibration is keyed by the pair `(device_id, sensor_key)`, so two
 *     devices reporting the same sensor key have two independent rows;
 *   • an unknown pair reads back as the identity default with
 *     `configured: false` — NOT a 404;
 *   • `scale_a = 0` is refused with a plain 400 (a validation error, not a
 *     missing migration);
 *   • when `degraded` is set it behaves like production today — the agri-db
 *     migration `f4b6d2e8c1a9` is missing, so every call, read included, is
 *     refused with the 400 that names it.
 *
 * Test-only helper: nothing in the app imports it.
 */

import type { FarmSectorNode } from '@agri/api-client/farmApi';
import type { MyDevice } from '@agri/api-client/myDevicesApi';
import type { SensorCalibration } from '@agri/api-client/sensorCalibrationApi';
import { DEFAULT_DEVICES, DEFAULT_SECTORS } from './fakeSensorGroupServer';

export const CALIBRATION_MIGRATION_REFUSAL = {
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

const reject = (status: number, detail: string) =>
  Promise.reject({ response: { status, data: { detail } } });

export interface FakeCalibrationServer {
  /** Simulate the deployment where the migration has not been applied. */
  degraded: boolean;
  rows: Map<string, SensorCalibration>;
  sectors: FarmSectorNode[];
  devices: MyDevice[];
  seed: (
    deviceId: number,
    sensorKey: string,
    values: Partial<SensorCalibration>
  ) => SensorCalibration;
}

const rowKey = (deviceId: number, sensorKey: string) =>
  `${deviceId}:${sensorKey}`;

export function makeFakeCalibrationServer(): FakeCalibrationServer {
  const server: FakeCalibrationServer = {
    degraded: false,
    rows: new Map(),
    sectors: JSON.parse(JSON.stringify(DEFAULT_SECTORS)),
    devices: JSON.parse(JSON.stringify(DEFAULT_DEVICES)),
    seed(deviceId, sensorKey, values) {
      const row: SensorCalibration = {
        device_id: deviceId,
        sensor_key: sensorKey,
        scale_a: 1,
        offset_b: 0,
        unit: '',
        is_active: true,
        note: null,
        configured: true,
        ...values,
      };
      server.rows.set(rowKey(deviceId, sensorKey), row);
      return row;
    },
  };
  return server;
}

type Mocks = {
  mockGet: jest.Mock;
  mockPut: jest.Mock;
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const CALIBRATION_PATH = /^\/sensor-calibrations\/(\d+)\/(.+)$/;

/** Point the mocked axios instance at `server`. */
export function wireFakeCalibrationServer(
  server: FakeCalibrationServer,
  { mockGet, mockPut }: Mocks
) {
  mockGet.mockImplementation((url: string) => {
    if (url === '/sectors/overview') {
      return Promise.resolve({ data: clone(server.sectors) });
    }
    if (url === '/my-devices') {
      return Promise.resolve({ data: clone(server.devices) });
    }
    const match = CALIBRATION_PATH.exec(url);
    if (match) {
      if (server.degraded) return Promise.reject(CALIBRATION_MIGRATION_REFUSAL);
      const deviceId = Number(match[1]);
      const sensorKey = decodeURIComponent(match[2]);
      const stored = server.rows.get(rowKey(deviceId, sensorKey));
      if (stored) return Promise.resolve({ data: clone(stored) });
      // The identity default — an un-calibrated sensor is not an error.
      return Promise.resolve({
        data: {
          device_id: deviceId,
          sensor_key: sensorKey,
          scale_a: 1,
          offset_b: 0,
          unit: '',
          is_active: true,
          note: null,
          configured: false,
        } satisfies SensorCalibration,
      });
    }
    return reject(404, `no fake handler for GET ${url}`);
  });

  mockPut.mockImplementation((url: string, body: Record<string, unknown>) => {
    if (server.degraded) return Promise.reject(CALIBRATION_MIGRATION_REFUSAL);
    const match = CALIBRATION_PATH.exec(url);
    if (!match) return reject(404, `no fake handler for PUT ${url}`);
    const scaleA = Number(body.scale_a);
    if (!Number.isFinite(scaleA) || scaleA === 0) {
      // agri-api's own validation — an ordinary 400, nothing to do with the
      // migration, so the UI must NOT read it as "feature unavailable".
      return reject(400, 'scale_a must not be 0.');
    }
    const deviceId = Number(match[1]);
    const sensorKey = decodeURIComponent(match[2]);
    const row: SensorCalibration = {
      device_id: deviceId,
      sensor_key: sensorKey,
      scale_a: scaleA,
      offset_b: Number(body.offset_b ?? 0),
      unit: String(body.unit ?? ''),
      is_active: body.is_active !== false,
      note: (body.note as string | null) ?? null,
      configured: true,
    };
    server.rows.set(rowKey(deviceId, sensorKey), row);
    return Promise.resolve({ data: clone(row) });
  });
}
