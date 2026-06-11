const KEY = 'userSensorAccessByUsername';

/** Capteurs (clés catalogue) visibles pour un utilisateur sur son tableau de bord. */
export type UserSensorAccess = {
  sensorKeys: string[];
  role: 'user' | 'admin';
};

export type UserSensorAccessMap = Record<string, UserSensorAccess>;

export function loadUserSensorAccessMap(): UserSensorAccessMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as UserSensorAccessMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveUserSensorAccessMap(map: UserSensorAccessMap) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(map));
}

export function setUserSensorAccess(
  username: string,
  access: UserSensorAccess
) {
  const map = loadUserSensorAccessMap();
  map[username.toLowerCase()] = access;
  saveUserSensorAccessMap(map);
}

export function getUserSensorAccess(username: string): UserSensorAccess | null {
  const map = loadUserSensorAccessMap();
  return map[username.toLowerCase()] ?? null;
}
