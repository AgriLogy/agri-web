'use client';

import { useEffect, useState } from 'react';
import { userProfileApi } from '@agri/api-client/userProfileApi';
import {
  canDelete as canDeleteLevel,
  canEdit as canEditLevel,
  canManageUsers as canManageUsersLevel,
  normalizeAccessLevel,
  type AccessLevel,
} from '@agri/api-client/accessLevel';

/**
 * The caller's RBAC tier, surfaced through the app's existing localStorage
 * session (agri-web #99). Identity already lives in `localStorage` alongside
 * the JWT + `isTechnician`; this adds the tier the same way, fetched ONCE from
 * `GET /users/me` and shared across every consumer via the module-level cache
 * below — mounting ten gated buttons triggers exactly one request, not ten.
 *
 * The stored value seeds the initial render so a returning user's controls do
 * not flicker; the fetch then confirms it. While unresolved, and on any error,
 * the tier is the most restrictive (`monitor`) — a control can only appear once
 * we KNOW the caller may use it, never speculatively.
 *
 * ⚠ Never the security boundary — the server enforces every tier (403 on a
 * forbidden write regardless of what this returns). This is UX only.
 */

const STORAGE_KEY = 'accessLevel';

let cachedLevel: AccessLevel | undefined;
let inFlight: Promise<AccessLevel> | null = null;

function readStored(): AccessLevel | undefined {
  if (typeof window === 'undefined') return undefined;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw ? normalizeAccessLevel(raw) : undefined;
}

/**
 * Resolve the caller's tier, fetching `/users/me` at most once per page load.
 * Concurrent callers share the same in-flight promise; a resolved value is
 * cached for the session. A failed fetch resolves to `monitor` rather than
 * rejecting, so gating stays closed on the safe side.
 */
export function fetchAccessLevel(): Promise<AccessLevel> {
  if (cachedLevel !== undefined) return Promise.resolve(cachedLevel);
  if (inFlight) return inFlight;
  inFlight = userProfileApi
    .get()
    .then((profile) => {
      const level = normalizeAccessLevel(profile.access_level);
      cachedLevel = level;
      try {
        window.localStorage.setItem(STORAGE_KEY, level);
      } catch {
        /* private-mode / storage disabled: fine, cache stays in memory */
      }
      return level;
    })
    .catch(() => normalizeAccessLevel(undefined))
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export interface AccessLevelState {
  level: AccessLevel;
  /** True until the first `/users/me` resolves (or the cache already had it). */
  loading: boolean;
}

export function useAccessLevel(): AccessLevelState {
  const [level, setLevel] = useState<AccessLevel>(
    () => cachedLevel ?? readStored() ?? 'monitor'
  );
  const [loading, setLoading] = useState<boolean>(
    () => cachedLevel === undefined
  );

  useEffect(() => {
    let active = true;
    if (cachedLevel !== undefined) {
      setLevel(cachedLevel);
      setLoading(false);
      return;
    }
    void fetchAccessLevel().then((resolved) => {
      if (!active) return;
      setLevel(resolved);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return { level, loading };
}

export interface Capabilities extends AccessLevelState {
  /** Editor+ : create / edit + run irrigation. */
  canEdit: boolean;
  /** Admin only : delete a resource outright. */
  canDelete: boolean;
  /** Admin only : manage technicians / account users. */
  canManageUsers: boolean;
}

/**
 * The one hook UI code should reach for: booleans derived from the single tier
 * mapping in `@agri/api-client/accessLevel`, so no component ever compares a
 * tier string itself.
 */
export function useCan(): Capabilities {
  const { level, loading } = useAccessLevel();
  return {
    level,
    loading,
    canEdit: canEditLevel(level),
    canDelete: canDeleteLevel(level),
    canManageUsers: canManageUsersLevel(level),
  };
}

/** Test seam: forget the process-wide cache so each case starts clean. */
export function __resetAccessLevelCache(): void {
  cachedLevel = undefined;
  inFlight = null;
}
