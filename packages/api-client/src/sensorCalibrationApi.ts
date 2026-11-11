/**
 * Thin axios wrapper around `/sensor-calibrations` (agri-web #97, agri-api #440).
 *
 * One row per sensor — the pair `(device_id, sensor_key)`, the same identity
 * sensor groups key on — holding the affine correction
 * `real = raw × scale_a + offset_b`, the unit `real` is expressed in, and an
 * `is_active` switch that disables the correction while keeping the
 * coefficients.
 *
 *   GET  /sensor-calibrations/{device_id}/{sensor_key}
 *        → the stored row, or the identity default
 *          (`scale_a=1, offset_b=0, unit='', is_active=true, configured=false`)
 *   PUT  /sensor-calibrations/{device_id}/{sensor_key}
 *        → upsert; 201 the first time, 200 afterwards; rejects `scale_a = 0`
 *   POST /sensor-calibrations/fit
 *        → stateless: fit an equation's coefficients to reference points and
 *          preview raw values through it (agri-api #460). Nothing stored.
 *
 * ── Equation calibration (#460) ──────────────────────────────────────────────
 * A row may instead carry `equation` (in `x`, the captured value) with its
 * `coefficients`; it then replaces `scale_a`/`offset_b` everywhere on the
 * server. On save the SERVER refits from `reference_points` and stores the
 * `fit_metrics`. See `calibrationEquationModel.ts`.
 *
 * Keep in sync with agri-api `fastapp/routers/sensor_calibrations.py`.
 *
 * ── Not applied to what you see ──────────────────────────────────────────────
 * Storing a calibration does NOT yet change displayed readings: alerts and
 * reports are computed server-side, and applying the correction only in the
 * browser would make the dashboard disagree with the alert that fired on the
 * same sensor. Read-path application is a separate backend ticket. The editor
 * says so, in plain words, to every farmer who saves one.
 *
 * ── Degradation ──────────────────────────────────────────────────────────────
 * The agri-db migration `f4b6d2e8c1a9` is NOT applied to production yet, so
 * writes come back 400 naming it. {@link probeAvailability} settles it with a
 * READ (no side effect), and `isSensorCalibrationUnavailableError` recognises
 * the refusal on any real write.
 */

import api from './api';
import type { FitMetrics, ReferencePoint } from './calibrationEquationModel';
import {
  classifyProbeError,
  type SchemaAvailability,
} from './schemaAvailability';
import {
  SENSOR_CALIBRATION_MIGRATION,
  SENSOR_CALIBRATION_TABLES,
} from './sensorCalibrationModel';

/** The API's view of one calibration row. Snake case: this is the wire shape. */
export interface SensorCalibration {
  device_id: number;
  sensor_key: string;
  scale_a: number;
  offset_b: number;
  unit: string;
  is_active: boolean;
  note: string | null;
  /** `false` when the server answered with the identity default, not a row. */
  configured: boolean;
  /** #460 — '' (or absent, on an older API) = affine calibration. */
  equation?: string;
  coefficients?: Record<string, number> | null;
  reference_points?: ReferencePoint[] | null;
  fit_metrics?: FitMetrics | null;
  /** `false` when the deployment lacks agri-db `a7c3e9f1b2d4` (affine only). */
  equation_available?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SensorCalibrationWritePayload {
  scale_a: number;
  offset_b: number;
  unit: string;
  is_active: boolean;
  note?: string | null;
  /** '' / null = affine. */
  equation?: string | null;
  /** Seeds the server-side fit; used as-is when there are no points. */
  coefficients?: Record<string, number> | null;
  reference_points?: ReferencePoint[] | null;
}

export interface CalibrationFitRequest {
  equation: string;
  reference_points: ReferencePoint[];
  initial?: Record<string, number> | null;
  preview_raw?: number[];
}

export interface CalibrationFitPoint extends ReferencePoint {
  predicted: number;
  /** predicted − real, in the unit of the real value. */
  residual: number;
}

export interface CalibrationFitResponse {
  /** Canonical form (`^` → `**`) — what the server will store. */
  equation: string;
  coefficient_names: string[];
  coefficients: Record<string, number>;
  /** `null` when nothing was fitted nor verified (no points). */
  metrics: FitMetrics | null;
  points: CalibrationFitPoint[];
  preview: { raw: number; real: number | null; error?: string }[];
}

export type SensorCalibrationAvailability = SchemaAvailability;

const MARKERS = [SENSOR_CALIBRATION_MIGRATION, ...SENSOR_CALIBRATION_TABLES];

const path = (deviceId: number, sensorKey: string) =>
  `/sensor-calibrations/${deviceId}/${encodeURIComponent(sensorKey)}`;

export const sensorCalibrationApi = {
  get: (deviceId: number, sensorKey: string): Promise<SensorCalibration> =>
    api.get<SensorCalibration>(path(deviceId, sensorKey)).then((r) => r.data),

  /** Upsert. 201 the first time, 200 afterwards — both resolve the same way. */
  save: (
    deviceId: number,
    sensorKey: string,
    payload: SensorCalibrationWritePayload
  ): Promise<SensorCalibration> =>
    api
      .put<SensorCalibration>(path(deviceId, sensorKey), payload)
      .then((r) => r.data),

  /** Fit + preview, nothing stored. A 400 `detail` explains a bad equation. */
  fit: (request: CalibrationFitRequest): Promise<CalibrationFitResponse> =>
    api
      .post<CalibrationFitResponse>('/sensor-calibrations/fit', request)
      .then((r) => r.data),

  /**
   * Is the feature actually writable here?
   *
   * A GET is the honest probe: the server checks the schema before it looks
   * the row up, so
   *   • schema missing → 400 naming migration `f4b6d2e8c1a9` → `unavailable`;
   *   • schema present → 200 (identity default) or 404 → `available`,
   * and unlike a write it cannot leave anything behind.
   */
  probeAvailability: (
    deviceId: number,
    sensorKey: string
  ): Promise<SensorCalibrationAvailability> =>
    api
      .get(path(deviceId, sensorKey))
      .then((): SensorCalibrationAvailability => 'available')
      .catch(
        (error: unknown): SensorCalibrationAvailability =>
          classifyProbeError(error, MARKERS)
      ),
};
