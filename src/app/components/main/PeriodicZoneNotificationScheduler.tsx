'use client';

import { useEffect, useRef } from 'react';
import {
  getAllZoneNotificationConfigs,
  getNotificationConfigById,
  recordZoneNotificationSent,
  ZONE_NOTIFICATION_CONFIG_UPDATED_EVENT,
} from '@/app/lib/zoneNotificationConfigStorage';
import { prependNotificationsToCache } from '@/app/lib/notificationsCacheStorage';
import { buildPeriodicZoneReminderNotification } from '@/app/lib/zoneNotificationTemplate';
import {
  msUntilNextDelivery,
  normalizeDeliveryRate,
  shouldDeliverNow,
} from '@/app/lib/notificationDeliveryRate';

/**
 * Re-evaluate at least this often so config edits, clock changes and very long
 * rates (e.g. weekly) are picked up promptly without one giant timer.
 */
const MAX_TICK_MS = 30 * 60 * 1000;
const MIN_TICK_MS = 1000;

/**
 * Delivers a local "reminder" notification for each zone config, throttled by
 * that config's flexible delivery rate (`deliveryRate`). The last-sent time is
 * persisted (`lastNotifiedAt`), so the user is never notified more often than
 * their chosen period — even across reloads.
 */
export default function PeriodicZoneNotificationScheduler() {
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  useEffect(() => {
    const timers = timersRef.current;

    const clearTimers = () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };

    const scheduleConfig = (configId: string) => {
      const existing = timers.get(configId);
      if (existing) clearTimeout(existing);

      const cfg = getNotificationConfigById(configId);
      if (!cfg) {
        timers.delete(configId);
        return;
      }
      const rate = normalizeDeliveryRate(cfg.deliveryRate);
      const wait = Math.min(
        MAX_TICK_MS,
        Math.max(MIN_TICK_MS, msUntilNextDelivery(rate, cfg.lastNotifiedAt))
      );

      const timer = setTimeout(() => {
        const latest = getNotificationConfigById(configId);
        if (!latest) {
          timers.delete(configId);
          return;
        }
        const latestRate = normalizeDeliveryRate(latest.deliveryRate);
        if (shouldDeliverNow(latestRate, latest.lastNotifiedAt)) {
          prependNotificationsToCache([
            buildPeriodicZoneReminderNotification(latest),
          ]);
          recordZoneNotificationSent(configId);
        }
        scheduleConfig(configId); // re-arm for the next window
      }, wait);

      timers.set(configId, timer);
    };

    const scheduleAll = () => {
      clearTimers();
      for (const cfg of getAllZoneNotificationConfigs()) {
        scheduleConfig(cfg.configId);
      }
    };

    scheduleAll();
    window.addEventListener(
      ZONE_NOTIFICATION_CONFIG_UPDATED_EVENT,
      scheduleAll
    );
    return () => {
      window.removeEventListener(
        ZONE_NOTIFICATION_CONFIG_UPDATED_EVENT,
        scheduleAll
      );
      clearTimers();
    };
  }, []);

  return null;
}
