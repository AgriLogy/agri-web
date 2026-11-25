/**
 * Fakes for the shell / common stories (group A, agri-web #195): the
 * notifications inbox that drives the bells, and the manager-affirmation
 * banner. Data is invented — never real farms, people or coordinates.
 */
import { http, HttpResponse } from 'msw';
import { api } from './api';

const ago = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

/** Shape returned by `GET /notifications` (one row per notification). */
export type FakeNotificationRow = {
  id: number;
  is_read: boolean;
  zone_id: number;
  zone_name: string;
  notification: {
    notification_date: string;
    yesterday_temperature: string;
    today_temperature: string;
    soil_humidity: string;
    ET0: string;
    zone_name: string;
  };
};

/** `count` notifications for one zone; the first `unread` are unread. */
export function fakeNotifications(
  zoneId: number,
  zoneName: string,
  count: number,
  unread: number,
  firstId = 1000
): FakeNotificationRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: firstId + i,
    is_read: i >= unread,
    zone_id: zoneId,
    zone_name: zoneName,
    notification: {
      notification_date: ago(6 + i * 24),
      yesterday_temperature: (27 + (i % 5)).toFixed(1),
      today_temperature: (29 + (i % 4)).toFixed(1),
      soil_humidity: (22 + (i % 7)).toFixed(1),
      ET0: (5.2 + (i % 3) * 0.3).toFixed(1),
      zone_name: zoneName,
    },
  }));
}

/** localStorage key the notification hooks merge API rows into. */
const NOTIFICATIONS_CACHE_KEY = 'agrilogy_notifications_cache_v1';

/**
 * The bells merge `/notifications` with a localStorage cache (and keep the
 * cache when the API returns an empty list), so one story's inbox would leak
 * into the next. Use as a story/meta `beforeEach`.
 */
export const clearNotificationCache = () => {
  try {
    window.localStorage.removeItem(NOTIFICATIONS_CACHE_KEY);
  } catch {
    /* storage unavailable: nothing to clear */
  }
};

/** `GET /notifications` answering with the given rows. */
export const notificationsHandler = (rows: FakeNotificationRow[]) =>
  http.get(api('/notifications'), () =>
    HttpResponse.json({ notifications: rows })
  );

/** `GET /manager-affirmations` answering with `pending` pending requests. */
export const affirmationsHandler = (pending = 0) =>
  http.get(api('/manager-affirmations'), () =>
    HttpResponse.json(
      Array.from({ length: pending }, (_, i) => ({
        id: 500 + i,
        action: 'delete_zone',
        payload: { zone_id: 3 + i },
        status: 'pending',
        requested_by: 43,
        requested_by_username: 'Technicien démo',
        decided_by: null,
        decided_by_username: null,
        decided_at: null,
        decision_note: '',
        created_at: ago(2 + i),
      }))
    )
  );
