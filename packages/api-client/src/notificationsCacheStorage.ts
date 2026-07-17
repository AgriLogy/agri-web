const STORAGE_KEY = 'agrilogy_notifications_cache_v1';

/** Zone IDs whose notification rows are hidden until the user saves a zone config again. */
const SUPPRESSED_ZONE_IDS_KEY = 'agrilogy_suppressed_zone_notification_ids_v1';

/** Config IDs whose rows are hidden after deleting that notification configuration. */
const SUPPRESSED_CONFIG_IDS_KEY =
  'agrilogy_suppressed_notification_config_ids_v1';

/** Individual notification row IDs the user deleted, so an API re-fetch does not revive them. */
const SUPPRESSED_NOTIFICATION_IDS_KEY =
  'agrilogy_suppressed_notification_ids_v1';

/** Fired when the notification cache changes locally (prepend / mark read / periodic). */
export const NOTIFICATIONS_CACHE_UPDATED_EVENT =
  'agrilogy-notifications-cache-updated';

export function notifyNotificationsCacheChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CACHE_UPDATED_EVENT));
}

export function isLocalMergedNotificationSource(
  s: string | undefined
): boolean {
  return s === 'local_zone_template' || s === 'local_periodic';
}

/** API may return a non-array; never call .map on raw payload. */
export function normalizeApiNotificationsList(raw: unknown): unknown[] {
  return Array.isArray(raw) ? raw : [];
}

export function readNotificationsFromCache(): unknown[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeNotificationsToCache(rows: unknown[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Insert at the beginning so newest entries appear first in the UI. */
export function prependNotificationsToCache(newRows: unknown[]): void {
  if (newRows.length === 0) return;
  const existing = readNotificationsFromCache();
  writeNotificationsToCache([...newRows, ...existing]);
  notifyNotificationsCacheChanged();
}

const LEGACY_PRUNE_FLAG = 'agrilogy_notif_prune_local_v2';

/**
 * One-time self-heal for existing users: the duplicate-on-save bug left two
 * near-identical local rows per config (the representation/confirmation card +
 * an immediate periodic reminder). De-dupe local rows to ONE per
 * (source, config) — keeping the first (newest, since rows are prepended) — so
 * each config shows a single card. Real API rows are untouched.
 */
export function pruneLegacyLocalNotifications(): void {
  if (typeof window === 'undefined') return;
  try {
    if (localStorage.getItem(LEGACY_PRUNE_FLAG)) return;
    const rows = readNotificationsFromCache();
    const seen = new Set<string>();
    const kept = rows.filter((r) => {
      const src = (r as { _source?: string } | null)?._source;
      if (src === 'local_zone_template' || src === 'local_periodic') {
        const key = `${src}::${notificationRowConfigId(r) ?? ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
      }
      return true;
    });
    if (kept.length !== rows.length) {
      writeNotificationsToCache(kept);
      notifyNotificationsCacheChanged();
    }
    localStorage.setItem(LEGACY_PRUNE_FLAG, '1');
  } catch {
    /* localStorage unavailable — skip */
  }
}

type CachedRow = { id?: number; is_read?: boolean; _source?: string };

function readSuppressedZoneIds(): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(SUPPRESSED_ZONE_IDS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(
      Array.isArray(arr)
        ? arr
            .map((x) => (typeof x === 'number' ? x : Number(x)))
            .filter(
              (x): x is number => typeof x === 'number' && Number.isFinite(x)
            )
        : []
    );
  } catch {
    return new Set();
  }
}

function writeSuppressedZoneIds(ids: Set<number>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SUPPRESSED_ZONE_IDS_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

function readSuppressedConfigIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(SUPPRESSED_CONFIG_IDS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(
      Array.isArray(arr)
        ? arr.filter(
            (x): x is string => typeof x === 'string' && x.trim() !== ''
          )
        : []
    );
  } catch {
    return new Set();
  }
}

function writeSuppressedConfigIds(ids: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SUPPRESSED_CONFIG_IDS_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

function readSuppressedNotificationIds(): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(SUPPRESSED_NOTIFICATION_IDS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(
      Array.isArray(arr)
        ? arr
            .map((x) => (typeof x === 'number' ? x : Number(x)))
            .filter(
              (x): x is number => typeof x === 'number' && Number.isFinite(x)
            )
        : []
    );
  } catch {
    return new Set();
  }
}

function writeSuppressedNotificationIds(ids: Set<number>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      SUPPRESSED_NOTIFICATION_IDS_KEY,
      JSON.stringify([...ids])
    );
  } catch {
    /* ignore */
  }
}

/** When present on a cached row, ties the entry to a stored zone notification config (secteur). */
export function notificationRowConfigId(row: unknown): string | undefined {
  if (!row || typeof row !== 'object') return undefined;
  const o = row as Record<string, unknown>;
  const top = o.notification_config_id;
  if (typeof top === 'string' && top.trim()) return top.trim();
  const n = o.notification;
  if (n && typeof n === 'object') {
    const nested = (n as Record<string, unknown>).notification_config_id;
    if (typeof nested === 'string' && nested.trim()) return nested.trim();
  }
  return undefined;
}

/** Call when the user deletes a notification configuration so merged API data does not revive those rows. */
export function suppressNotificationConfigInList(configId: string): void {
  const id = configId?.trim();
  if (!id) return;
  const s = readSuppressedConfigIds();
  s.add(id);
  writeSuppressedConfigIds(s);
}

/** Call when the user saves a notification configuration so its rows can appear again. */
export function clearNotificationConfigListSuppress(configId: string): void {
  const id = configId?.trim();
  if (!id) return;
  const s = readSuppressedConfigIds();
  s.delete(id);
  writeSuppressedConfigIds(s);
}

/** Call when the user deletes a zone notification so API re-fetches do not bring rows back immediately. */
export function suppressZoneNotificationsList(zoneId: number): void {
  if (typeof zoneId !== 'number' || !Number.isFinite(zoneId)) return;
  const s = readSuppressedZoneIds();
  s.add(zoneId);
  writeSuppressedZoneIds(s);
}

/** Call when the user saves zone notification config so list entries for that zone can show again. */
export function clearZoneNotificationsListSuppress(zoneId: number): void {
  if (typeof zoneId !== 'number' || !Number.isFinite(zoneId)) return;
  const s = readSuppressedZoneIds();
  s.delete(zoneId);
  writeSuppressedZoneIds(s);
}

function coerceZoneId(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export function notificationRowZoneId(row: unknown): number | undefined {
  if (!row || typeof row !== 'object') return undefined;
  const o = row as Record<string, unknown>;
  const top = coerceZoneId(o.zone_id);
  if (top !== undefined) return top;
  const n = o.notification;
  if (n && typeof n === 'object') {
    return coerceZoneId((n as Record<string, unknown>).zone_id);
  }
  return undefined;
}

function applySuppressedZoneFilter(rows: unknown[]): unknown[] {
  const suppressedZones = readSuppressedZoneIds();
  const suppressedConfigs = readSuppressedConfigIds();
  const suppressedNotifs = readSuppressedNotificationIds();
  if (
    suppressedZones.size === 0 &&
    suppressedConfigs.size === 0 &&
    suppressedNotifs.size === 0
  )
    return rows;
  return rows.filter((r) => {
    const nid = (r as { id?: number } | null)?.id;
    if (typeof nid === 'number' && suppressedNotifs.has(nid)) return false;
    const cid = notificationRowConfigId(r);
    if (cid != null && suppressedConfigs.has(cid)) return false;
    const z = notificationRowZoneId(r);
    return z == null || !suppressedZones.has(z);
  });
}

/** Hide a single notification (by row id) the user deleted, so an API re-fetch does not bring it back. */
export function suppressNotificationId(notificationId: number): void {
  if (typeof notificationId !== 'number' || !Number.isFinite(notificationId))
    return;
  const s = readSuppressedNotificationIds();
  s.add(notificationId);
  writeSuppressedNotificationIds(s);
}

/**
 * Remove ONE notification from the cache by its row id. Deletes only that card —
 * the zone / notification config and every other notification stay intact.
 */
export function removeNotificationFromCacheById(notificationId: number): void {
  if (typeof notificationId !== 'number' || !Number.isFinite(notificationId))
    return;
  suppressNotificationId(notificationId);
  const rows = readNotificationsFromCache();
  const filtered = rows.filter(
    (r) => (r as { id?: number } | null)?.id !== notificationId
  );
  if (filtered.length !== rows.length) {
    writeNotificationsToCache(filtered);
  }
  notifyNotificationsCacheChanged();
}

/** Remove cached rows generated for a given notification configuration (local id on row). */
export function removeNotificationsForConfigFromCache(configId: string): void {
  const id = configId?.trim();
  if (!id) return;
  const rows = readNotificationsFromCache();
  const filtered = rows.filter((r) => notificationRowConfigId(r) !== id);
  if (filtered.length === rows.length) return;
  writeNotificationsToCache(filtered);
  notifyNotificationsCacheChanged();
}

/** Remove all cached notification rows bound to this zone (immediate UI / inbox cleanup). */
export function removeNotificationsForZoneFromCache(zoneId: number): void {
  if (typeof zoneId !== 'number' || !Number.isFinite(zoneId)) return;
  const rows = readNotificationsFromCache();
  const filtered = rows.filter((r) => {
    const z = notificationRowZoneId(r);
    if (z === undefined) return true;
    return z !== zoneId;
  });
  writeNotificationsToCache(filtered);
  notifyNotificationsCacheChanged();
}

/** Drops prior « confirmation d’enregistrement » rows for this config (avoid duplicates when saving again). */
export function removeLocalZoneTemplateNotificationsForConfig(
  configId: string
): void {
  const id = configId?.trim();
  if (!id) return;
  const rows = readNotificationsFromCache();
  const filtered = rows.filter((r) => {
    if (!r || typeof r !== 'object') return true;
    const o = r as CachedRow;
    if (o._source !== 'local_zone_template') return true;
    return notificationRowConfigId(r) !== id;
  });
  if (filtered.length === rows.length) return;
  writeNotificationsToCache(filtered);
  notifyNotificationsCacheChanged();
}

/** After the inbox is opened, all rows are marked read; keep that when re-merging API payloads. */
export function markAllNotificationsReadInCache(): void {
  const rows = readNotificationsFromCache();
  const updated = rows.map((r) =>
    r && typeof r === 'object'
      ? { ...(r as Record<string, unknown>), is_read: true }
      : r
  );
  writeNotificationsToCache(updated);
}

/** Keep locally generated rows (e.g. zone save confirmation) when syncing API data. */
export function mergeNotificationsForStorage(apiRowsIfAny: unknown): unknown[] {
  const apiRows = normalizeApiNotificationsList(apiRowsIfAny);
  const cached = readNotificationsFromCache() as CachedRow[];

  const wasReadId = new Set<number>();
  for (const x of cached) {
    if (x && typeof x.id === 'number' && x.is_read === true) {
      wasReadId.add(x.id);
    }
  }

  /** Empty payload: do not replace cache (avoids wiping the inbox on transient API gaps / wrong shape). */
  if (apiRows.length === 0) {
    const kept = cached
      .filter(
        (x) =>
          x && typeof x === 'object' && typeof (x as CachedRow).id === 'number'
      )
      .map((row) => {
        const r = row as CachedRow;
        const id = r.id;
        if (typeof id === 'number' && wasReadId.has(id)) {
          return { ...(r as object), is_read: true };
        }
        return row;
      });
    return applySuppressedZoneFilter(kept);
  }

  const apiIds = new Set(
    apiRows
      .map((r) => (r as CachedRow).id)
      .filter((id): id is number => typeof id === 'number')
  );
  const localKeep = cached.filter(
    (x) =>
      x &&
      isLocalMergedNotificationSource(x._source) &&
      typeof x.id === 'number' &&
      !apiIds.has(x.id)
  );

  const apiMerged = apiRows.map((row) => {
    const r = row as CachedRow;
    const id = r.id;
    if (typeof id === 'number' && wasReadId.has(id)) {
      return { ...(r as object), is_read: true };
    }
    return row;
  });

  return applySuppressedZoneFilter([...localKeep, ...apiMerged]);
}
