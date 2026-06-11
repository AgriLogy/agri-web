'use client';

import { useEffect, useState } from 'react';

const EVENT = 'agrilogy-unit-overrides-changed';
const STORAGE_KEY = 'frontendUnitOverrides';

/** Call after writing `frontendUnitOverrides` so charts in the same tab refresh. */
export function notifyUnitOverridesChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENT));
}

/**
 * Bumps when unit/calibration overrides change (same tab or other tabs).
 * Use in useMemo deps when building chart series from raw API values.
 */
export function useUnitOverridesRevision(): number {
  const [rev, setRev] = useState(0);
  useEffect(() => {
    const bump = () => setRev((r) => r + 1);
    window.addEventListener(EVENT, bump);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) bump();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(EVENT, bump);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return rev;
}
