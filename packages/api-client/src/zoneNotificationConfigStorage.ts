import type { NotificationThresholds } from './notificationDecisionEngine';
import { DEFAULT_NOTIFICATION_THRESHOLDS } from './notificationDecisionEngine';
import type { DeliveryRate } from './notificationDeliveryRate';
import {
  deliveryRateFromMinutes,
  normalizeDeliveryRate,
} from './notificationDeliveryRate';
import {
  clearNotificationConfigListSuppress,
  clearZoneNotificationsListSuppress,
  notificationRowConfigId,
  notificationRowZoneId,
  removeNotificationsForConfigFromCache,
  suppressNotificationConfigInList,
} from './notificationsCacheStorage';

/** Fired when a zone notification config is saved (reschedule periodic reminders). */
export const ZONE_NOTIFICATION_CONFIG_UPDATED_EVENT =
  'agrilogy-zone-notification-config-updated';

/** v1: zone notification setup is persisted only in the browser (localStorage). */
const STORAGE_KEY = 'agrilogy_zone_notification_configs_v1';

export type SoilTypeLightHeavy = 'light' | 'medium' | 'heavy';

/** One row in the Kc coefficient table (stade cultural). */
export type KcProtocolStageRow = {
  stageName: string;
  durationDays: number;
  kcStart: number;
  kcEnd: number;
  amountMm: number;
  active: boolean;
};

export function defaultKcProtocolStages(): KcProtocolStageRow[] {
  return [
    {
      stageName: 'Avril',
      durationDays: 30,
      kcStart: 0.35,
      kcEnd: 0.6,
      amountMm: 15,
      active: true,
    },
  ];
}

/** Weighted-by-duration average of mid-Kc for active rows (fallback: all rows). */
export function representativeKcFromStages(
  stages: KcProtocolStageRow[]
): number {
  const active = stages.filter((s) => s.active);
  const list = active.length > 0 ? active : stages;
  if (list.length === 0) return 0.85;
  let sum = 0;
  let w = 0;
  for (const s of list) {
    const days = Math.max(0, Number(s.durationDays) || 0);
    const k0 = Number(s.kcStart);
    const k1 = Number(s.kcEnd);
    const mid =
      Number.isFinite(k0) && Number.isFinite(k1) ? (k0 + k1) / 2 : 0.85;
    if (days > 0) {
      sum += mid * days;
      w += days;
    } else {
      sum += mid;
      w += 1;
    }
  }
  if (w <= 0) return 0.85;
  return Math.min(2, Math.max(0, sum / w));
}

export interface ZoneNotificationConfig {
  /** Stable id for this notification setup (one secteur / sous-parcelle inside the zone). */
  configId: string;
  zoneId: number;
  /** Secteur (or block) within the zone that this configuration applies to. */
  secteurLabel: string;
  notificationName: string;
  soilType: SoilTypeLightHeavy;
  soilCharacteristics: string;
  soilMoistureSource: string;
  kcMode: 'table' | 'manual';
  kc: number;
  /** Label for the Kc table protocol (e.g. crop / season). */
  kcProtocolName: string;
  /** Stades with duration, Kc range, and optional mm amount per row. */
  kcStages: KcProtocolStageRow[];
  /** Humidity inputs used with Kc (depth / profile). */
  kcSensorHumidityLow: boolean;
  kcSensorHumidityMid: boolean;
  kcSensorHumidityHigh: boolean;
  et0Source: 'weather_station' | 'calculated';
  precipSource: string;
  krFactor: number;
  zoneAreaHa: number;
  cropType: string;
  flowRateM3h: number;
  irrigationMethod: 'drip_sprinkler' | 'subsurface_drip';
  /** @deprecated kept for back-compat; the cadence is now `deliveryRate`. */
  intervalMinutes: number;
  /**
   * Flexible delivery rate — the minimum period before the user receives the
   * next notification for this sector (e.g. every 20 min / 4 h / day / week,
   * or any custom amount+unit).
   */
  deliveryRate: DeliveryRate;
  /** ISO timestamp of the last delivered periodic notification (throttle state). */
  lastNotifiedAt?: string | null;
  soilPermeabilityPct: number;
  valveMode: 'auto' | 'manual';
  vpdThresholdKpa: number;
  rootMonitoring: 'on' | 'off';
  criticalThresholdPct: number;
  et0KcAdvisoryMm: number;
  maxWaterM3: number;
  notifyEmail: boolean;
  notifySms: boolean;
  notifyWhatsapp: boolean;
  /** Optional per-config recipient overrides; blank = use the user's profile contact. */
  overridePhone?: string;
  overrideEmail?: string;
  updatedAt: string;
}

export type ZoneNotificationConfigMap = Record<string, ZoneNotificationConfig>;

function migrateLegacyMap(
  raw: Record<string, ZoneNotificationConfig | unknown>
): { map: ZoneNotificationConfigMap; changed: boolean } {
  const out: ZoneNotificationConfigMap = {};
  let changed = false;
  for (const [k, v] of Object.entries(raw)) {
    if (!v || typeof v !== 'object') continue;
    const row = { ...(v as ZoneNotificationConfig) };
    const legacyNumericKey = /^\d+$/.test(k);
    if (legacyNumericKey || !row.configId?.trim()) {
      row.configId = row.configId?.trim()
        ? row.configId
        : `migrated-z${Number(row.zoneId) || k}-${k}`;
      if (typeof row.secteurLabel !== 'string') row.secteurLabel = '';
      changed = true;
    }
    row.configId = row.configId.trim();
    if (typeof row.secteurLabel !== 'string') row.secteurLabel = '';
    // Ensure every config has a valid flexible delivery rate. Legacy configs
    // only had `intervalMinutes`; derive the nicest rate from it.
    if (!row.deliveryRate || typeof row.deliveryRate !== 'object') {
      row.deliveryRate = deliveryRateFromMinutes(row.intervalMinutes);
      changed = true;
    } else {
      const norm = normalizeDeliveryRate(row.deliveryRate);
      if (
        norm.amount !== row.deliveryRate.amount ||
        norm.unit !== row.deliveryRate.unit
      ) {
        changed = true;
      }
      row.deliveryRate = norm;
    }
    out[row.configId] = row as ZoneNotificationConfig;
    if (k !== row.configId) changed = true;
  }
  return { map: out, changed };
}

function readMap(): ZoneNotificationConfigMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<
      string,
      ZoneNotificationConfig | unknown
    >;
    if (!parsed || typeof parsed !== 'object') return {};
    const { map, changed } = migrateLegacyMap(parsed);
    if (changed) {
      writeMap(map);
    }
    return map;
  } catch {
    return {};
  }
}

function writeMap(map: ZoneNotificationConfigMap): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function getAllZoneNotificationConfigs(): ZoneNotificationConfig[] {
  return Object.values(readMap());
}

export function getNotificationConfigsForZone(
  zoneId: number
): ZoneNotificationConfig[] {
  if (typeof zoneId !== 'number' || !Number.isFinite(zoneId)) return [];
  return getAllZoneNotificationConfigs().filter((c) => c.zoneId === zoneId);
}

export function getNotificationConfigById(
  configId: string | null | undefined
): ZoneNotificationConfig | undefined {
  const id = configId?.trim();
  if (!id) return undefined;
  return readMap()[id];
}

/**
 * Pick the stored config that best matches a notification row (same zone; name used to disambiguate).
 */
function notificationNameFromCacheRow(row: unknown): string | undefined {
  if (!row || typeof row !== 'object') return undefined;
  const o = row as { notification?: { notification_name?: unknown } };
  const n = o.notification;
  if (
    n &&
    typeof n === 'object' &&
    typeof (n as { notification_name?: unknown }).notification_name === 'string'
  ) {
    return (n as { notification_name: string }).notification_name;
  }
  return undefined;
}

/**
 * Resolves which stored notification config a cache/API row refers to (explicit id, or zone + name).
 */
export function resolveStoredNotificationConfigId(
  row: unknown
): string | undefined {
  const cid = notificationRowConfigId(row);
  if (cid) return cid;
  const zid = notificationRowZoneId(row);
  if (zid == null) return undefined;
  return findNotificationConfigForZoneRow(
    zid,
    notificationNameFromCacheRow(row)
  )?.configId;
}

export function findNotificationConfigForZoneRow(
  zoneId: number | null | undefined,
  notificationName?: string | null
): ZoneNotificationConfig | undefined {
  if (zoneId == null || !Number.isFinite(zoneId)) return undefined;
  const list = getNotificationConfigsForZone(zoneId);
  if (list.length === 0) return undefined;
  if (list.length === 1) return list[0];
  const needle = notificationName?.trim().toLowerCase();
  if (!needle) return undefined;
  const exact = list.filter(
    (c) => c.notificationName.trim().toLowerCase() === needle
  );
  if (exact.length === 1) return exact[0];
  return undefined;
}

/** @deprecated Use getNotificationConfigById or findNotificationConfigForZoneRow. */
export function getZoneNotificationConfig(
  zoneId: number
): ZoneNotificationConfig | undefined {
  const list = getNotificationConfigsForZone(zoneId);
  return list[0];
}

export function hasZoneNotificationConfig(zoneId: number): boolean {
  return getNotificationConfigsForZone(zoneId).length > 0;
}

export function saveZoneNotificationConfig(
  config: ZoneNotificationConfig
): void {
  const id = config.configId?.trim();
  if (!id) {
    throw new Error('configId is required');
  }
  clearNotificationConfigListSuppress(id);
  /** Legacy: whole-zone suppress (old delete flow) hid all rows for this zone until save. */
  clearZoneNotificationsListSuppress(config.zoneId);
  const map = readMap();
  map[id] = {
    ...config,
    configId: id,
    updatedAt: new Date().toISOString(),
  };
  writeMap(map);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(ZONE_NOTIFICATION_CONFIG_UPDATED_EVENT)
    );
  }
}

export function deleteNotificationConfigById(configId: string): void {
  const id = configId?.trim();
  if (!id) return;
  const map = readMap();
  if (!map[id]) return;
  delete map[id];
  writeMap(map);
  suppressNotificationConfigInList(id);
  removeNotificationsForConfigFromCache(id);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(ZONE_NOTIFICATION_CONFIG_UPDATED_EVENT)
    );
  }
}

/**
 * Records that a periodic notification was just delivered for a config, so the
 * delivery-rate throttle can space out the next one. Persists `lastNotifiedAt`
 * WITHOUT firing the config-updated event (avoids reschedule storms).
 */
export function recordZoneNotificationSent(
  configId: string,
  atISO?: string
): void {
  const id = configId?.trim();
  if (!id) return;
  const map = readMap();
  const cfg = map[id];
  if (!cfg) return;
  map[id] = { ...cfg, lastNotifiedAt: atISO ?? new Date().toISOString() };
  writeMap(map);
}

/** Deletes every secteur configuration for a zone (legacy / reset). */
export function deleteAllNotificationConfigsForZone(zoneId: number): void {
  if (typeof zoneId !== 'number' || !Number.isFinite(zoneId)) return;
  const toRemove = getNotificationConfigsForZone(zoneId).map((c) => c.configId);
  for (const id of toRemove) {
    deleteNotificationConfigById(id);
  }
}

export function thresholdsFromConfig(
  config: ZoneNotificationConfig | undefined
): NotificationThresholds {
  if (!config) return { ...DEFAULT_NOTIFICATION_THRESHOLDS };
  return {
    humidityCriticalPct: config.criticalThresholdPct,
    et0KcAdvisoryMm: config.et0KcAdvisoryMm,
  };
}
