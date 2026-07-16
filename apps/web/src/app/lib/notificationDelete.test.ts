/**
 * Regression test for "deleting one notification deletes all" (issue #63).
 *
 * The feed card and the slide-out now delete a SINGLE notification by row id
 * via removeNotificationFromCacheById — never the whole zone/config. A deleted
 * notification must also stay gone after the next `GET /notifications` merge.
 */
import {
  readNotificationsFromCache,
  writeNotificationsToCache,
  removeNotificationFromCacheById,
  mergeNotificationsForStorage,
} from '@agri/api-client/notificationsCacheStorage';

type Row = { id: number; zone_id?: number; notification_config_id?: string };

const rows: Row[] = [
  { id: 1, zone_id: 10, notification_config_id: 'cfg-a' },
  { id: 2, zone_id: 10, notification_config_id: 'cfg-a' },
  { id: 3, zone_id: 20, notification_config_id: 'cfg-b' },
];

const ids = (list: unknown[]): number[] =>
  list.map((r) => (r as Row).id).sort((a, b) => a - b);

beforeEach(() => {
  localStorage.clear();
});

describe('removeNotificationFromCacheById', () => {
  it('removes only the targeted notification, leaving the rest', () => {
    writeNotificationsToCache(rows);

    removeNotificationFromCacheById(2);

    expect(ids(readNotificationsFromCache())).toEqual([1, 3]);
  });

  it('does not touch other notifications that share the same zone/config', () => {
    // ids 1 and 2 both belong to zone 10 / cfg-a — deleting 1 must keep 2.
    writeNotificationsToCache(rows);

    removeNotificationFromCacheById(1);

    expect(ids(readNotificationsFromCache())).toEqual([2, 3]);
  });

  it('keeps the deleted notification gone after a re-fetch merge', () => {
    writeNotificationsToCache(rows);
    removeNotificationFromCacheById(2);

    // The API still returns all three rows; the deleted one must not revive.
    const merged = mergeNotificationsForStorage(rows);

    expect(ids(merged)).toEqual([1, 3]);
  });

  it('ignores invalid ids without wiping the cache', () => {
    writeNotificationsToCache(rows);

    removeNotificationFromCacheById(Number.NaN);

    expect(ids(readNotificationsFromCache())).toEqual([1, 2, 3]);
  });
});
