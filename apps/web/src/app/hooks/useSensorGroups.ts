'use client';

import { useCallback, useEffect, useState } from 'react';
import { farmApi } from '@agri/api-client/farmApi';
import { myDevicesApi } from '@agri/api-client/myDevicesApi';
import {
  sensorGroupApi,
  type SensorGroup,
  type SensorGroupsAvailability,
} from '@agri/api-client/sensorGroupApi';
import {
  buildAvailableSensors,
  type AvailableSensor,
} from '@agri/api-client/sensorGroupModel';

export interface SensorGroupsState {
  groups: SensorGroup[];
  /** Every sensor the account owns, whether grouped or not. */
  available: AvailableSensor[];
  loading: boolean;
  error: boolean;
  /**
   * Whether grouping can be persisted at all on this deployment. An EMPTY list
   * is not proof it can: until the agri-db migration is applied the API answers
   * reads with `[]` and refuses writes, so the empty case is probed explicitly
   * instead of being shown as "you have no groups yet".
   */
  availability: SensorGroupsAvailability;
  reload: () => Promise<void>;
  /** Force the degraded state after a write came back naming the migration. */
  markUnavailable: () => void;
}

/**
 * Loads the account's sensor groups together with the sensor universe they
 * draw from (farm overview captors resolved to their device), shared by the
 * dashboard card and the Réglages manager.
 */
export function useSensorGroups(): SensorGroupsState {
  const [groups, setGroups] = useState<SensorGroup[]>([]);
  const [available, setAvailable] = useState<AvailableSensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [availability, setAvailability] =
    useState<SensorGroupsAvailability>('unknown');

  const reload = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [groupRows, sectors, devices] = await Promise.all([
        sensorGroupApi.list(),
        farmApi.overview().catch(() => []),
        myDevicesApi.list().catch(() => []),
      ]);
      setGroups(groupRows);
      setAvailable(buildAvailableSensors(sectors, devices));
      if (groupRows.length > 0) {
        // Rows came back, so the tables are obviously there — skip the probe.
        setAvailability('available');
      } else {
        setAvailability(await sensorGroupApi.probeAvailability());
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const markUnavailable = useCallback(() => setAvailability('unavailable'), []);

  return {
    groups,
    available,
    loading,
    error,
    availability,
    reload,
    markUnavailable,
  };
}
