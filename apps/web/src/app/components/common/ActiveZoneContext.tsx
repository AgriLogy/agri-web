'use client';

/**
 * Tiny context that exposes the currently-selected zone id to anything
 * mounted under StationMain (or any other dashboard root).
 *
 * Why: the chart cards are deeply nested inside per-sensor *Main / *LastData
 * components and prop-drilling `zoneId` down 22 component pairs is pure
 * churn. Reading from context keeps the wiring at exactly one provider.
 */

import React, { createContext, useContext } from 'react';

const ActiveZoneContext = createContext<number | null>(null);

export const ActiveZoneProvider: React.FC<{
  zoneId: number | null;
  children: React.ReactNode;
}> = ({ zoneId, children }) => (
  <ActiveZoneContext.Provider value={zoneId}>
    {children}
  </ActiveZoneContext.Provider>
);

export function useActiveZoneId(): number | null {
  return useContext(ActiveZoneContext);
}
