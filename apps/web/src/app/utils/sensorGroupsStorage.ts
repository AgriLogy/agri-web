/**
 * LEGACY device-local sensor groups (`sensorGroupsV1`).
 *
 * Groups are account data now — they are persisted through
 * `@agri/api-client/sensorGroupApi` (agri-web #95). This module survives for
 * exactly one reason: farmers still have groups sitting in the localStorage of
 * the browser they created them in, and those must not silently disappear.
 *
 * It is therefore READ-ONLY. Nothing writes groups here any more, and the
 * import flow never deletes the stored payload — it only records that the
 * offer was answered (`sensorGroupsV1.imported`) so the banner stops nagging.
 * The user's original data stays on disk, recoverable, until they clear the
 * browser themselves.
 */

const KEY = 'sensorGroupsV1';
const IMPORTED_KEY = 'sensorGroupsV1.imported';

export type SensorGroup = {
  id: string;
  name: string;
  sensorKeys: string[];
};

/** Groups left behind by the pre-#95 device-local implementation. */
export function loadSensorGroups(): SensorGroup[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SensorGroup[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (g) => g && typeof g.name === 'string' && Array.isArray(g.sensorKeys)
    );
  } catch {
    return [];
  }
}

/** Has the one-time "import these into your account" offer been answered? */
export function localGroupsImportHandled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(IMPORTED_KEY) != null;
  } catch {
    return true;
  }
}

/**
 * Remember that the offer was answered (imported or dismissed). The groups
 * themselves are deliberately left in place — see the module docstring.
 */
export function markLocalGroupsImportHandled(
  outcome: 'imported' | 'dismissed'
) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      IMPORTED_KEY,
      JSON.stringify({ outcome, at: new Date().toISOString() })
    );
  } catch {
    /* private mode / quota — the banner reappearing is the harmless failure */
  }
}
