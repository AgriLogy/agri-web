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
  /** #460 — `false` simulates a deployment without the equation columns. */
  equationAvailable: boolean;
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
    equationAvailable: true,
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
        equation: '',
        coefficients: null,
        reference_points: null,
        fit_metrics: null,
        equation_available: server.equationAvailable,
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
  mockPost?: jest.Mock;
};

type Point = { captured: number; real: number };

/**
 * Stand-in for agri-core's fit, faithful for the LINEAR family the tests use:
 * ordinary least squares for `a*x + b`, `b` alone for `x + b`. Anything with
 * `__` or without `x` is refused with a 400 `detail`, as the real parser does.
 */
export function fakeFit(equation: string, points: Point[]) {
  // Canonical form as agri-core stores it: trimmed, `^` → `**`, spacing kept.
  const canonical = equation.trim().replace(/\^/g, '**');
  const eq = canonical.replace(/\s+/g, '');
  if (eq.includes('__') || !/x/.test(eq)) {
    return { error: `Invalid equation ${JSON.stringify(equation)}.` };
  }
  const n = points.length;
  let a = 1;
  let b = 0;
  if (eq === 'a*x+b') {
    if (n < 2)
      return {
        error:
          '2 coefficient(s) (a, b) need at least 2 reference points; got ' +
          n +
          '.',
      };
    const sx = points.reduce((s, p) => s + p.captured, 0);
    const sy = points.reduce((s, p) => s + p.real, 0);
    const sxx = points.reduce((s, p) => s + p.captured * p.captured, 0);
    const sxy = points.reduce((s, p) => s + p.captured * p.real, 0);
    a = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    b = (sy - a * sx) / n;
  } else if (eq === 'x+b') {
    b = points.reduce((s, p) => s + (p.real - p.captured), 0) / n;
  }
  const coefficients: Record<string, number> =
    eq === 'a*x+b' ? { a, b } : eq === 'x+b' ? { b } : {};
  const predict = (x: number) => (eq === 'x+b' ? x + b : a * x + b);
  const residuals = points.map((p) => predict(p.captured) - p.real);
  const mean = points.reduce((s, p) => s + p.real, 0) / n;
  const sst = points.reduce((s, p) => s + (p.real - mean) ** 2, 0);
  const sse = residuals.reduce((s, r) => s + r * r, 0);
  return {
    equation: canonical,
    coefficient_names: Object.keys(coefficients),
    coefficients,
    predict,
    metrics: {
      n_points: n,
      rmse: Math.sqrt(sse / n),
      mae: residuals.reduce((s, r) => s + Math.abs(r), 0) / n,
      max_abs_error: Math.max(...residuals.map(Math.abs)),
      r2: sst === 0 ? null : 1 - sse / sst,
      degrees_of_freedom: n - Object.keys(coefficients).length,
      converged: true,
      iterations: 1,
      warnings: [],
    },
    points: points.map((p, i) => ({
      ...p,
      predicted: predict(p.captured),
      residual: residuals[i],
    })),
  };
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const CALIBRATION_PATH = /^\/sensor-calibrations\/(\d+)\/(.+)$/;

/** Point the mocked axios instance at `server`. */
export function wireFakeCalibrationServer(
  server: FakeCalibrationServer,
  { mockGet, mockPut, mockPost }: Mocks
) {
  mockPost?.mockImplementation((url: string, body: Record<string, unknown>) => {
    if (url !== '/sensor-calibrations/fit') {
      return reject(404, `no fake handler for POST ${url}`);
    }
    const result = fakeFit(
      String(body.equation ?? ''),
      (body.reference_points as Point[]) ?? []
    );
    if ('error' in result) return reject(400, result.error as string);
    const { predict, ...rest } = result;
    return Promise.resolve({
      data: {
        ...rest,
        preview: ((body.preview_raw as number[]) ?? []).map((raw) => ({
          raw,
          real: predict(raw),
        })),
      },
    });
  });

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
          equation: '',
          equation_available: server.equationAvailable,
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
    const equation = String(body.equation ?? '').trim();
    if (equation && !server.equationAvailable) {
      return reject(
        400,
        'Equation calibration is not available on this deployment: apply ' +
          'the agri-db migration that adds it (a7c3e9f1b2d4), then retry.'
      );
    }
    let fitted: ReturnType<typeof fakeFit> | null = null;
    if (equation) {
      fitted = fakeFit(equation, (body.reference_points as Point[]) ?? []);
      if ('error' in fitted) return reject(400, fitted.error as string);
    }
    if (!equation && (!Number.isFinite(scaleA) || scaleA === 0)) {
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
      equation: fitted && !('error' in fitted) ? fitted.equation : '',
      coefficients: fitted && !('error' in fitted) ? fitted.coefficients : null,
      reference_points: (body.reference_points as Point[] | null) ?? null,
      fit_metrics: fitted && !('error' in fitted) ? fitted.metrics : null,
      equation_available: server.equationAvailable,
    };
    server.rows.set(rowKey(deviceId, sensorKey), row);
    return Promise.resolve({ data: clone(row) });
  });
}
