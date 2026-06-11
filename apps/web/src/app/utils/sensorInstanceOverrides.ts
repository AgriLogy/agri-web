import type { SensorCatalogItem } from '@/app/utils/sensorCatalog';

const KEY = 'sensorInstanceOverrides';

export type SensorInstanceOverride = {
  displayName?: string;
  /** Ex. sol, eau, météo, serre, autre */
  placementType?: string;
  /** Si false, masqué des vues filtrées (réglages) */
  visible?: boolean;
};

export type SensorInstanceOverridesMap = Record<string, SensorInstanceOverride>;

export function loadSensorInstanceOverrides(): SensorInstanceOverridesMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SensorInstanceOverridesMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveSensorInstanceOverrides(map: SensorInstanceOverridesMap) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(map));
}

export function mergeCatalogWithOverrides(
  catalog: SensorCatalogItem[],
  overrides: SensorInstanceOverridesMap
): Array<SensorCatalogItem & SensorInstanceOverride> {
  return catalog.map((item) => ({
    ...item,
    ...overrides[item.key],
  }));
}
