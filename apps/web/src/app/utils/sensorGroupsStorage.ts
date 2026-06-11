const KEY = 'sensorGroupsV1';

export type SensorGroup = {
  id: string;
  name: string;
  sensorKeys: string[];
};

function genId() {
  return `g_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function loadSensorGroups(): SensorGroup[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SensorGroup[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSensorGroups(groups: SensorGroup[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(groups));
}

export function createEmptyGroup(name: string): SensorGroup {
  return { id: genId(), name: name.trim() || 'Nouveau groupe', sensorKeys: [] };
}
