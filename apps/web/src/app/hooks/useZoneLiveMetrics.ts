'use client';

import { useEffect, useState } from 'react';
import {
  fetchZoneLiveMetrics,
  type ZoneLiveMetrics,
} from '@agri/api-client/zoneLiveMetricsApi';

/**
 * Per-zone cache so N notification cards for the same zone trigger ONE fetch
 * (each card calls this hook). Promises are memoised for the session.
 */
const cache = new Map<number, Promise<ZoneLiveMetrics>>();

/**
 * Fetch a zone's latest real weather/soil/ET₀ readings for the notification
 * cards. Returns `null` until loaded (or when disabled / no zone), so callers
 * fall back to the existing placeholder values.
 */
export function useZoneLiveMetrics(
  zoneId: number | null | undefined,
  enabled = true
): ZoneLiveMetrics | null {
  const [metrics, setMetrics] = useState<ZoneLiveMetrics | null>(null);

  useEffect(() => {
    if (!enabled || zoneId == null || !Number.isFinite(zoneId)) {
      setMetrics(null);
      return;
    }
    let alive = true;
    let p = cache.get(zoneId);
    if (!p) {
      p = fetchZoneLiveMetrics(zoneId);
      cache.set(zoneId, p);
    }
    p.then((m) => {
      if (alive) setMetrics(m);
    }).catch(() => {
      if (alive) setMetrics(null);
    });
    return () => {
      alive = false;
    };
  }, [zoneId, enabled]);

  return metrics;
}
