'use client';

import React, { useMemo, useState } from 'react';

export type ChartDateRangeContext = {
  startIdx: number;
  endIdx: number;
  setRange: (range: number[]) => void;
};

/**
 * Resets the visible window when the timeline changes (new fetch) by remounting
 * the inner state via `key` — avoids sync setState in effects.
 */
function ChartDateRangeGateInner({
  timeline,
  children,
}: {
  timeline: string[];
  children: (ctx: ChartDateRangeContext) => React.ReactNode;
}) {
  const n = timeline.length;
  const maxIdx = Math.max(0, n - 1);
  const [startIdx, setStartIdx] = useState(0);
  const [endIdx, setEndIdx] = useState(maxIdx);

  const setRange = (vals: number[]) => {
    let [a, b] = vals;
    if (a > b) [a, b] = [b, a];
    a = Math.max(0, Math.min(Math.floor(a), maxIdx));
    b = Math.max(0, Math.min(Math.floor(b), maxIdx));
    setStartIdx(a);
    setEndIdx(b);
  };

  return <>{children({ startIdx, endIdx, setRange })}</>;
}

export default function ChartDateRangeGate({
  timeline,
  children,
}: {
  timeline: string[];
  children: (ctx: ChartDateRangeContext) => React.ReactNode;
}) {
  const resetKey = useMemo(
    () =>
      timeline.length === 0
        ? 'empty'
        : `${timeline[0]}|${timeline[timeline.length - 1]}|${timeline.length}`,
    [timeline]
  );

  return (
    <ChartDateRangeGateInner key={resetKey} timeline={timeline}>
      {children}
    </ChartDateRangeGateInner>
  );
}
