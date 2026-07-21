'use client';

import { useEffect, useMemo, useState } from 'react';

import api from '@agri/api-client/api';
import getActiveGraphs, {
  type ActiveGraphResponse,
} from '@/app/utils/getActiveGraphs';

import type { ChartFrequency } from '@/app/utils/chartDateWindow';

import type { ZoneOption } from './ZoneSelect';
import {
  type ChartDateRange,
  defaultChartDateRange,
} from './ChartDateRangeControl';

export type AnalyticsFilters = {
  startDate: string;
  endDate: string;
  selectedZone: number | null;
};

export type AnalyticsHeaderState = {
  zones: ZoneOption[];
  selectedZone: number | null;
  setSelectedZone: (id: number) => void;
  zoneName: string | null;
  /** The selected zone's sector name (User → Sector → Zone), or null. */
  sectorName: string | null;
  range: ChartDateRange;
  setRange: (next: ChartDateRange) => void;
  /** Page-wide chart data frequency. Charts bucket+average themselves to it. */
  frequency: ChartFrequency;
  setFrequency: (next: ChartFrequency) => void;
  activeGraph: ActiveGraphResponse | null;
  filters: AnalyticsFilters;
};

/**
 * One hook for the four analytics pages (station / soil / water / plant).
 * Holds zones + selected zone + date range + per-zone activeGraph config
 * and exposes the `filters` object every chart sub-component expects.
 */
export function useAnalyticsHeader(): AnalyticsHeaderState {
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [activeGraph, setActiveGraph] = useState<ActiveGraphResponse | null>(
    null
  );
  const [range, setRange] = useState<ChartDateRange>(defaultChartDateRange);
  // Default to hourly so freshly-loaded pages tame high-frequency devices
  // (e.g. router 02's per-minute flood) out of the box.
  const [frequency, setFrequency] = useState<ChartFrequency>({ kind: 'hour' });

  useEffect(() => {
    api
      .get<ZoneOption[]>('/zones')
      .then((res) => {
        const list = res.data ?? [];
        setZones(list);
        if (list.length > 0) setSelectedZone(list[0].id);
      })
      .catch((err) => console.error('Failed to fetch zones', err));
  }, []);

  useEffect(() => {
    if (selectedZone !== null)
      getActiveGraphs(selectedZone).then(setActiveGraph);
  }, [selectedZone]);

  const zoneName = useMemo(
    () => zones.find((z) => z.id === selectedZone)?.name ?? null,
    [zones, selectedZone]
  );

  const sectorName = useMemo(
    () => zones.find((z) => z.id === selectedZone)?.sector_name ?? null,
    [zones, selectedZone]
  );

  const filters = useMemo(
    () => ({
      startDate: range.startDate,
      endDate: range.endDate,
      selectedZone,
    }),
    [range.startDate, range.endDate, selectedZone]
  );

  return {
    zones,
    selectedZone,
    setSelectedZone,
    zoneName,
    sectorName,
    range,
    setRange,
    frequency,
    setFrequency,
    activeGraph,
    filters,
  };
}
