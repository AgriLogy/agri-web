'use client';

import { ConfigProvider, DatePicker } from 'antd';
import frFR from 'antd/locale/fr_FR';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/fr';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

dayjs.locale('fr');

const { RangePicker } = DatePicker;

/**
 * Five canonical analytics windows + a "personnalisé" path through the
 * calendar. `i18nKey` resolves to a `shell.chartDateRange.*` message;
 * `label` is a French fallback only. The keys stay machine-readable in
 * case the caller wants to track which preset fired.
 */
export const DATE_PRESETS = [
  {
    key: '24h',
    i18nKey: 'shell.chartDateRange.preset24h',
    label: '24 dernières heures',
    days: 1,
  },
  {
    key: '7j',
    i18nKey: 'shell.chartDateRange.preset7d',
    label: '7 derniers jours',
    days: 7,
  },
  {
    key: '30j',
    i18nKey: 'shell.chartDateRange.preset30d',
    label: '30 derniers jours',
    days: 30,
  },
  {
    key: '90j',
    i18nKey: 'shell.chartDateRange.preset90d',
    label: '90 derniers jours',
    days: 90,
  },
  {
    key: '12mois',
    i18nKey: 'shell.chartDateRange.preset12m',
    label: '12 derniers mois',
    days: 365,
  },
] as const;

export type ChartDateRange = {
  /** ISO YYYY-MM-DD, inclusive. */
  startDate: string;
  /** ISO YYYY-MM-DD, inclusive. */
  endDate: string;
};

export type ChartDateRangeControlProps = {
  value: ChartDateRange;
  onChange: (next: ChartDateRange) => void;
  /** Restrict picking to dates not in the future. Default: true. */
  disableFuture?: boolean;
  /** Optional className for layout-level styling (size, margin). */
  className?: string;
};

const toDayjs = (iso: string): Dayjs | null => (iso ? dayjs(iso) : null);
const toIso = (d: Dayjs): string => d.format('YYYY-MM-DD');

/**
 * Single date-range control shared by every analytics page. Wraps antd's
 * RangePicker - already a project dependency, already styled to the
 * brand primary via antdTheme.ts - and exposes the agronomy-friendly
 * presets confirmed with the team (24h / 7j / 30j / 90j / 12 mois).
 *
 * The control works at every breakpoint: antd's RangePicker renders one
 * month at narrow widths and two at wide widths automatically, so
 * mobile and tablet users get the same calendar surface that desktop
 * users do (which the legacy DateRangePicker hid below `lg`).
 */
export function ChartDateRangeControl({
  value,
  onChange,
  disableFuture = true,
  className,
}: ChartDateRangeControlProps) {
  const t = useTranslations();
  const disabledDate = (current: Dayjs) =>
    disableFuture && current && current.isAfter(dayjs().endOf('day'));

  const rangePresets = useMemo(
    () =>
      DATE_PRESETS.map((p) => ({
        label: t(p.i18nKey),
        value: [dayjs().subtract(p.days - 1, 'day'), dayjs()] as [Dayjs, Dayjs],
      })),
    [t]
  );

  return (
    <ConfigProvider locale={frFR}>
      <RangePicker
        className={className}
        value={[toDayjs(value.startDate), toDayjs(value.endDate)]}
        presets={rangePresets}
        disabledDate={disabledDate}
        allowClear={false}
        format="DD MMM YYYY"
        onChange={(range) => {
          if (!range || !range[0] || !range[1]) return;
          onChange({
            startDate: toIso(range[0]),
            endDate: toIso(range[1]),
          });
        }}
      />
    </ConfigProvider>
  );
}

/**
 * Convenience: an initial range covering the last 24 hours, the project's
 * default analytics window. A wider default (we used to ship 7 days) makes
 * freshly-deployed devices look broken — 22 readings clustered in 8 minutes
 * disappear inside a 7-day X-axis. 24h is dense enough to be readable for a
 * new device and still gives several hundred points for an established one.
 */
export function defaultChartDateRange(): ChartDateRange {
  return {
    startDate: toIso(dayjs().subtract(24, 'hour')),
    endDate: toIso(dayjs()),
  };
}
