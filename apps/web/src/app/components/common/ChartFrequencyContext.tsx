'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import {
  averageByFrequency,
  sortByTimestamp,
  type ChartFrequency,
} from '@/app/utils/chartDateWindow';

/**
 * Page-wide "data frequency" the analytics charts bucket themselves to.
 * Default is `native` (no bucketing) so any chart rendered OUTSIDE an analytics
 * page (e.g. admin previews) keeps its raw cadence; the four analytics pages
 * wrap their charts in {@link ChartFrequencyProvider} with a real frequency.
 */
const ChartFrequencyContext = createContext<ChartFrequency>({ kind: 'native' });

export function ChartFrequencyProvider({
  value,
  children,
}: {
  value: ChartFrequency;
  children: ReactNode;
}) {
  return (
    <ChartFrequencyContext.Provider value={value}>
      {children}
    </ChartFrequencyContext.Provider>
  );
}

export function useChartFrequency(): ChartFrequency {
  return useContext(ChartFrequencyContext);
}

/**
 * Sort + frequency-bucket a fetched sensor series against the active page
 * frequency, returning the bucketed `series` and its `timeline`. Drop-in
 * replacement for the `sortByTimestamp(data)` + `.map(d => d.timestamp)`
 * useMemo pair every chart Main used to hand-roll.
 */
export function useFrequencySeries<T extends { timestamp: string }>(data: T[]) {
  const freq = useChartFrequency();
  const series = useMemo(
    () => averageByFrequency(sortByTimestamp(data), freq),
    [data, freq]
  );
  const timeline = useMemo(() => series.map((d) => d.timestamp), [series]);
  return { series, timeline };
}

/**
 * Sort + frequency-bucket a single series against the active page frequency,
 * returning just the bucketed rows. For multi-series charts: bucket each raw
 * series with this, then union/merge as before — same-frequency buckets snap to
 * identical UTC-aligned timestamps so the series stay aligned.
 */
export function useBucketed<T extends { timestamp: string }>(data: T[]): T[] {
  const freq = useChartFrequency();
  return useMemo(
    () => averageByFrequency(sortByTimestamp(data), freq),
    [data, freq]
  );
}
