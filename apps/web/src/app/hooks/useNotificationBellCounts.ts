'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@agri/api-client/api';
import {
  mergeNotificationsForStorage,
  normalizeApiNotificationsList,
  NOTIFICATIONS_CACHE_UPDATED_EVENT,
  readNotificationsFromCache,
  writeNotificationsToCache,
} from '@agri/api-client/notificationsCacheStorage';

export type NotificationApiRow = {
  id: number;
  is_read: boolean;
  zone_id?: number;
  zone_name?: string;
  notification?: Record<string, unknown>;
};

export function useNotificationBellCounts(pollMs?: number) {
  const [totalUnread, setTotalUnread] = useState(0);
  const [unreadByZoneId, setUnreadByZoneId] = useState<Record<number, number>>(
    {}
  );

  const applyRows = useCallback((rows: NotificationApiRow[]) => {
    let unread = 0;
    const byZone: Record<number, number> = {};
    for (const r of rows) {
      if (!r.is_read) {
        unread++;
        if (typeof r.zone_id === 'number') {
          byZone[r.zone_id] = (byZone[r.zone_id] ?? 0) + 1;
        }
      }
    }
    setTotalUnread(unread);
    setUnreadByZoneId(byZone);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<{ notifications?: NotificationApiRow[] }>(
        '/notifications'
      );
      const apiRows = normalizeApiNotificationsList(res.data?.notifications);
      const merged = mergeNotificationsForStorage(apiRows);
      writeNotificationsToCache(merged);
      applyRows(merged as NotificationApiRow[]);
    } catch {
      const cached = readNotificationsFromCache() as NotificationApiRow[];
      applyRows(cached);
    }
  }, [applyRows]);

  useEffect(() => {
    void refresh();
    if (!pollMs || pollMs < 5000) return;
    const t = setInterval(() => void refresh(), pollMs);
    return () => clearInterval(t);
  }, [refresh, pollMs]);

  useEffect(() => {
    const onLocalCache = () => {
      applyRows(readNotificationsFromCache() as NotificationApiRow[]);
    };
    window.addEventListener(NOTIFICATIONS_CACHE_UPDATED_EVENT, onLocalCache);
    return () =>
      window.removeEventListener(
        NOTIFICATIONS_CACHE_UPDATED_EVENT,
        onLocalCache
      );
  }, [applyRows]);

  const unreadForZone = useCallback(
    (zoneId: number) => unreadByZoneId[zoneId] ?? 0,
    [unreadByZoneId]
  );

  return { totalUnread, unreadByZoneId, unreadForZone, refresh };
}
