/**
 * The RBAC access-level tiers, as ONE place (agri-web #99, USR-1).
 *
 * Dependency-free on purpose (type-only imports, erased at build time) so every
 * rule below is unit-testable without a DOM, axios or next-intl — the same
 * split as `sensorGroupModel.ts`.
 *
 * ⚠ This is NOT the security boundary. The server enforces every tier already:
 * a monitor's write returns 403 whatever the UI does. These helpers only decide
 * whether to SHOW a control that would otherwise fail — never whether an action
 * is *allowed*. The single deliberate consequence: an unknown or missing level
 * collapses to the most restrictive tier (`monitor`), so a UI glitch can only
 * ever HIDE a control, never wrongly reveal one.
 *
 * Backend contract (`GET /users/me` → `access_level`):
 *   monitor < editor < admin
 *   editor+ : create / edit + run irrigation
 *   admin   : + delete + user management
 */

/** The three tiers agri-api hands back, ordered least → most privileged. */
export type AccessLevel = 'monitor' | 'editor' | 'admin';

export const ACCESS_LEVELS: readonly AccessLevel[] = [
  'monitor',
  'editor',
  'admin',
];

/** Rank used for the `>=` tier comparisons. Never exported — compare via the
 *  named `can*` helpers so no tier string is spelled out at a call site. */
const RANK: Record<AccessLevel, number> = {
  monitor: 0,
  editor: 1,
  admin: 2,
};

/**
 * Coerce anything into a known tier, defaulting to the most restrictive.
 *
 * Missing, misspelled, a stale server value, `undefined` while `/users/me` is
 * still in flight — all become `monitor`. That is the safe default: the worst a
 * wrong guess can do is hide a control from someone who was entitled to it.
 */
export function normalizeAccessLevel(value: unknown): AccessLevel {
  return value === 'admin' || value === 'editor' ? value : 'monitor';
}

/** True when `level` sits at or above `minimum` in the tier order. */
export function atLeastAccessLevel(
  level: unknown,
  minimum: AccessLevel
): boolean {
  return RANK[normalizeAccessLevel(level)] >= RANK[minimum];
}

/** Create / edit rights: zones, alerts, notifications, groups, calibration,
 *  irrigation actions. Editor and admin; monitor cannot. */
export function canEdit(level: unknown): boolean {
  return atLeastAccessLevel(level, 'editor');
}

/** Delete rights (removing a resource outright). Admin only. */
export function canDelete(level: unknown): boolean {
  return atLeastAccessLevel(level, 'admin');
}

/** User-management rights (technicians, account users). Admin only. */
export function canManageUsers(level: unknown): boolean {
  return atLeastAccessLevel(level, 'admin');
}
