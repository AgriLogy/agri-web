'use client';

import { useCallback, useEffect, useState } from 'react';
import { farmApi } from '@agri/api-client/farmApi';
import { myDevicesApi } from '@agri/api-client/myDevicesApi';
import {
  sensorCalibrationApi,
  type SensorCalibration,
  type SensorCalibrationAvailability,
} from '@agri/api-client/sensorCalibrationApi';
import {
  buildAvailableSensors,
  type AvailableSensor,
} from '@agri/api-client/sensorGroupModel';
import {
  IDENTITY_CALIBRATION,
  normalizeUnit,
  type Calibration,
} from '@agri/api-client/sensorCalibrationModel';
import { getDefaultCalibrationForSensorKey } from '@/app/utils/sensorCalibrationDefaults';

export interface SensorCalibrationState {
  /** Every sensor the account owns, grouped or not — the same universe the
   *  sensor-group manager draws from. */
  available: AvailableSensor[];
  /** The sensor currently being edited, or `null` while none is picked. */
  selected: AvailableSensor | null;
  select: (identity: string) => void;
  /** The loaded calibration for `selected`, already seeded (see below). */
  calibration: Calibration | null;
  /** `false` when the server answered with the identity default, not a row. */
  configured: boolean;
  loadingSensors: boolean;
  loadingCalibration: boolean;
  error: boolean;
  /**
   * Whether calibration can be persisted at all on this deployment. A default
   * answer is NOT proof it can: until the agri-db migration is applied the API
   * refuses writes, so the case is probed explicitly instead of being shown as
   * "this sensor is simply not calibrated yet".
   */
  availability: SensorCalibrationAvailability;
  reloadCalibration: () => Promise<void>;
  /** Force the degraded state after a write came back naming the migration. */
  markUnavailable: () => void;
}

/**
 * Loads the account's sensors and, for the picked one, its stored calibration.
 *
 * Seeding: when the server has no row (`configured === false`) the draft starts
 * from `sensorCalibrationDefaults` — the manufacturer/PDF defaults keyed by
 * sensor key — rather than from a bare 1/0, so a sensor with a known factory
 * conversion opens pre-filled. Today that table is empty and the seed is the
 * identity, but filling one line in it must reach this screen with no other
 * change.
 */
export function useSensorCalibration(): SensorCalibrationState {
  const [available, setAvailable] = useState<AvailableSensor[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [calibration, setCalibration] = useState<Calibration | null>(null);
  const [configured, setConfigured] = useState(false);
  const [loadingSensors, setLoadingSensors] = useState(true);
  const [loadingCalibration, setLoadingCalibration] = useState(false);
  const [error, setError] = useState(false);
  const [availability, setAvailability] =
    useState<SensorCalibrationAvailability>('unknown');

  const selected =
    available.find((sensor) => sensor.key === selectedKey) ?? null;

  useEffect(() => {
    let cancelled = false;
    setLoadingSensors(true);
    setError(false);
    Promise.all([
      farmApi.overview().catch(() => []),
      myDevicesApi.list().catch(() => []),
    ])
      .then(([sectors, devices]) => {
        if (cancelled) return;
        const sensors = buildAvailableSensors(sectors, devices).filter(
          // A calibration row is keyed by device_id; a sensor whose zone has no
          // registered device cannot have one.
          (sensor) => sensor.deviceId != null
        );
        setAvailable(sensors);
        setSelectedKey((current) => current ?? sensors[0]?.key ?? null);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingSensors(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toCalibration = useCallback(
    (row: SensorCalibration, sensorKey: string): Calibration => {
      if (row.configured) {
        return {
          scaleA: row.scale_a,
          offsetB: row.offset_b,
          unit: normalizeUnit(row.unit),
          isActive: row.is_active,
          note: row.note ?? '',
        };
      }
      const seed = getDefaultCalibrationForSensorKey(sensorKey);
      return {
        ...IDENTITY_CALIBRATION,
        scaleA: seed.scaleA,
        offsetB: seed.offsetB,
      };
    },
    []
  );

  const reloadCalibration = useCallback(async () => {
    if (!selected || selected.deviceId == null) {
      setCalibration(null);
      setConfigured(false);
      return;
    }
    const deviceId = selected.deviceId;
    const sensorKey = selected.sensorKey;
    setLoadingCalibration(true);
    setError(false);
    try {
      const row = await sensorCalibrationApi.get(deviceId, sensorKey);
      setCalibration(toCalibration(row, sensorKey));
      setConfigured(Boolean(row.configured));
      if (row.configured) {
        // A real row came back, so the table is obviously there.
        setAvailability('available');
      } else {
        setAvailability(
          await sensorCalibrationApi.probeAvailability(deviceId, sensorKey)
        );
      }
    } catch (err) {
      // The GET itself is the probe: classify before giving up.
      setAvailability(
        await sensorCalibrationApi
          .probeAvailability(deviceId, sensorKey)
          .catch(() => 'unknown' as const)
      );
      setCalibration(
        toCalibration(
          {
            device_id: deviceId,
            sensor_key: sensorKey,
            scale_a: 1,
            offset_b: 0,
            unit: '',
            is_active: true,
            note: null,
            configured: false,
          },
          sensorKey
        )
      );
      setConfigured(false);
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      if (status !== 400) setError(true);
    } finally {
      setLoadingCalibration(false);
    }
  }, [selected, toCalibration]);

  useEffect(() => {
    void reloadCalibration();
  }, [reloadCalibration]);

  const markUnavailable = useCallback(() => setAvailability('unavailable'), []);

  return {
    available,
    selected,
    select: setSelectedKey,
    calibration,
    configured,
    loadingSensors,
    loadingCalibration,
    error,
    availability,
    reloadCalibration,
    markUnavailable,
  };
}
