'use client';

import { useEffect, useMemo, useState } from 'react';
import { useZoneLiveMetrics } from '@/app/hooks/useZoneLiveMetrics';
import { definedMetrics } from '@agri/api-client/zoneLiveMetricsApi';
import {
  evaluateV1NotificationDecision,
  parseNumericSensor,
  type DecisionEngineResult,
} from '@agri/api-client/notificationDecisionEngine';
import {
  findNotificationConfigForZoneRow,
  getNotificationConfigById,
  thresholdsFromConfig,
  ZONE_NOTIFICATION_CONFIG_UPDATED_EVENT,
  type ZoneNotificationConfig,
} from '@agri/api-client/zoneNotificationConfigStorage';
import type { NotificationPayload } from '@/app/components/notifications/Notification';

export interface UseNotificationDecisionResult {
  /** V1 decision engine output (null for local confirmation rows). */
  decision: DecisionEngineResult | null;
  /** Stored notification configuration this row is bound to, when any. */
  config: ZoneNotificationConfig | undefined;
}

/**
 * Resolve a notification row's stored configuration and run the shared V1
 * decision engine against its zone's latest readings. This wraps the existing
 * `evaluateV1NotificationDecision` classification (it does NOT reimplement it)
 * so the compact list row and the detail view read the exact same verdict.
 */
export function useNotificationDecision(
  id: number,
  notification: NotificationPayload
): UseNotificationDecisionResult {
  const zoneId = notification.zone_id;

  // Fill placeholder metrics with the zone's real latest readings (weather /
  // soil / ET₀); fall back to the notification's own values when unavailable.
  const liveMetrics = useZoneLiveMetrics(zoneId, true);
  const n = liveMetrics
    ? { ...notification, ...definedMetrics(liveMetrics) }
    : notification;

  const [configRev, setConfigRev] = useState(0);
  useEffect(() => {
    const bump = () => setConfigRev((x) => x + 1);
    window.addEventListener(ZONE_NOTIFICATION_CONFIG_UPDATED_EVENT, bump);
    return () =>
      window.removeEventListener(ZONE_NOTIFICATION_CONFIG_UPDATED_EVENT, bump);
  }, []);

  const config = useMemo(() => {
    const cid = notification.notification_config_id?.trim();
    if (cid) return getNotificationConfigById(cid);
    if (zoneId == null) return undefined;
    return findNotificationConfigForZoneRow(
      zoneId,
      notification.notification_name
    );
  }, [
    zoneId,
    notification.notification_config_id,
    notification.notification_name,
    configRev,
  ]);

  const [decision, setDecision] = useState<DecisionEngineResult | null>(null);
  useEffect(() => {
    if (notification.template_summary) {
      setDecision(null);
      return;
    }
    const kc = config?.kc ?? 1;
    const thresholds = thresholdsFromConfig(config);
    setDecision(
      evaluateV1NotificationDecision({
        et0Mm: parseNumericSensor(n.ET0),
        soilHumidityPct: parseNumericSensor(n.soil_humidity),
        kc,
        thresholds,
      })
    );
  }, [
    id,
    n.ET0,
    n.soil_humidity,
    zoneId,
    config?.kc,
    config?.criticalThresholdPct,
    config?.et0KcAdvisoryMm,
    notification.template_summary,
  ]);

  return { decision, config };
}
