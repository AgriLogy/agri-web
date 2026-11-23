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

export interface UseSensorGroupsOptions {
  /**
   * Run the write-based schema probe (`PATCH /sensor-groups/0`) when the list
   * comes back empty. Off by default: only a caller that can actually edit
   * groups (the Réglages manager, editor+) needs to know whether a write would
   * succeed. Read-only screens — the dashboard card, a technician anywhere —
   * must never send a write just by being opened: it surfaced as a 404 for
   * farmers and a 403 "Accès refusé" toast for technicians (QA tour, A5).
   */
  probe?: boolean;
}

/** Whether the empty-list availability probe should run. Pure, for tests. */
export function shouldProbeSensorGroups(input: {
  probe: boolean;
  loading: boolean;
  error: boolean;
  groupCount: number;
  availability: SensorGroupsAvailability;
}): boolean {
  return (
    input.probe &&
    !input.loading &&
    !input.error &&
    input.groupCount === 0 &&
    input.availability === 'unknown'
  );
}

/**
 * Loads the account's sensor groups together with the sensor universe they
 * draw from (farm overview captors resolved to their device), shared by the
 * dashboard card and the Réglages manager.
 */
export function useSensorGroups(
  options: UseSensorGroupsOptions = {}
): SensorGroupsState {
  const probe = options.probe ?? false;
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
      // Rows came back, so the tables are obviously there. An empty list
      // proves nothing: leave it `unknown` — the probe effect below settles it
      // only for callers allowed to write.
      if (groupRows.length > 0) setAvailability('available');
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Separate from `reload` so it also fires when `probe` turns true late
  // (the caller's access level resolves after the first render).
  // `probed` stops a retry loop when the verdict is itself `unknown`.
  const [probed, setProbed] = useState(false);
  const needsProbe =
    !probed &&
    shouldProbeSensorGroups({
      probe,
      loading,
      error,
      groupCount: groups.length,
      availability,
    });
  useEffect(() => {
    if (!needsProbe) return;
    let active = true;
    void sensorGroupApi.probeAvailability().then((verdict) => {
      if (!active) return;
      setAvailability(verdict);
      setProbed(true);
    });
    return () => {
      active = false;
    };
  }, [needsProbe]);

  const markUnavailable = useCallback(() => setAvailability('unavailable'), []);

  return {
    groups,
    available,
    // A pending probe counts as loading, so an editor never briefly sees the
    // "create / import" path offered before the verdict lands.
    loading: loading || needsProbe,
    error,
    availability,
    reload,
    markUnavailable,
  };
}
