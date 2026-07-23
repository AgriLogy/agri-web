/**
 * Unit tests for the RBAC tier mapping (agri-web #99).
 *
 * No DOM, no axios: the single source of truth for "who may do what" is decided
 * here, across the full monitor/editor/admin truth table plus the safety rule
 * that anything unrecognised collapses to the most restrictive tier.
 *
 * What regresses if the mapping is bypassed: a component comparing tier strings
 * itself (e.g. `level === 'admin'`) would drift from these rows the moment the
 * server adds or renames a tier, and — worse — a missing/garbage value would no
 * longer fail closed, so a UI glitch could reveal a delete button to a monitor.
 */
import {
  ACCESS_LEVELS,
  atLeastAccessLevel,
  canDelete,
  canEdit,
  canManageUsers,
  normalizeAccessLevel,
  type AccessLevel,
} from '@agri/api-client/accessLevel';

describe('normalizeAccessLevel', () => {
  it('passes the three known tiers through unchanged', () => {
    for (const level of ACCESS_LEVELS) {
      expect(normalizeAccessLevel(level)).toBe(level);
    }
  });

  it('collapses anything unknown or missing to monitor (fail closed)', () => {
    expect(normalizeAccessLevel(undefined)).toBe('monitor');
    expect(normalizeAccessLevel(null)).toBe('monitor');
    expect(normalizeAccessLevel('')).toBe('monitor');
    expect(normalizeAccessLevel('superuser')).toBe('monitor');
    expect(normalizeAccessLevel('ADMIN')).toBe('monitor'); // case-sensitive on purpose
    expect(normalizeAccessLevel(42)).toBe('monitor');
    expect(normalizeAccessLevel({})).toBe('monitor');
  });
});

describe('the can* truth table', () => {
  // level -> [canEdit, canDelete, canManageUsers]
  const table: Array<[AccessLevel, boolean, boolean, boolean]> = [
    ['monitor', false, false, false],
    ['editor', true, false, false],
    ['admin', true, true, true],
  ];

  it.each(table)(
    '%s: edit=%s delete=%s manageUsers=%s',
    (level, edit, del, users) => {
      expect(canEdit(level)).toBe(edit);
      expect(canDelete(level)).toBe(del);
      expect(canManageUsers(level)).toBe(users);
    }
  );

  it('an unknown tier has exactly a monitor’s (empty) rights', () => {
    expect(canEdit('mystery')).toBe(false);
    expect(canDelete('mystery')).toBe(false);
    expect(canManageUsers(undefined)).toBe(false);
  });

  it('delete and user-management are admin-only, never granted to an editor', () => {
    expect(canDelete('editor')).toBe(false);
    expect(canManageUsers('editor')).toBe(false);
  });
});

describe('atLeastAccessLevel', () => {
  it('orders monitor < editor < admin', () => {
    expect(atLeastAccessLevel('admin', 'monitor')).toBe(true);
    expect(atLeastAccessLevel('admin', 'editor')).toBe(true);
    expect(atLeastAccessLevel('admin', 'admin')).toBe(true);
    expect(atLeastAccessLevel('editor', 'admin')).toBe(false);
    expect(atLeastAccessLevel('monitor', 'editor')).toBe(false);
    expect(atLeastAccessLevel('monitor', 'monitor')).toBe(true);
  });
});
