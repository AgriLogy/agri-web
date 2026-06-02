/**
 * Shared axis styling and formatters for Recharts.
 * Use for consistent, modern, readable X/Y axes across all charts.
 */
import { formatNumber } from './formatNumber';

// —— Axis design: minimal, thin lines, subtle grid ———
const AXIS_STROKE = '#94a3b8';
const AXIS_STROKE_WIDTH = 1;
const GRID_STROKE = '#e2e8f0';
const TICK_FONT_SIZE = 11;
const TICK_FILL = '#64748b';
const FONT_FAMILY = 'system-ui, -apple-system, sans-serif';

/** Axis title (unit) size — compact, centered via label style */
export const AXIS_LABEL_FONT_PX = 11;

/**
 * Minimum chart margin so outside Y-axis unit labels ({@link yAxisLabelInsideLeft} /
 * {@link yAxisLabelInsideRight}) sit past tick numerals. Use on the corresponding side.
 */
export const CHART_MARGIN_LEFT_Y_LABEL = 40;
export const CHART_MARGIN_RIGHT_Y_LABEL = 44;

/**
 * Default pixel height of the Recharts surface (ChartStateView / ResponsiveContainer).
 * Large enough for axis labels and to leave vertical room under the plot for the period dragger.
 */
export const CHART_PLOT_HEIGHT_PX = 350;
/** VPD chart: slightly taller than default. */
export const CHART_PLOT_HEIGHT_VPD_PX = 520;
/** Charts with extra rows above the grid (zones, radar, etc.). */
export const CHART_PLOT_HEIGHT_TALL_PX = 560;

/**
 * ChartLastDataShell max height (md+): heading + plot + {@link CHART_PLOT_HEIGHT_PX} + date dragger (~130px) + margins.
 */
export const CHART_SHELL_MAX_HEIGHT = '900px';
/** Water/soil humidity: zone chips + taller plot + dragger. */
export const CHART_SHELL_MAX_HEIGHT_TALL = '1080px';

/**
 * Standard outer wrapper for analytics chart components (plant/soil/water pages).
 * Keeps headings and ChartStateView aligned with the chart column padding.
 */
export const analyticsChartPanelLayoutProps = {
  width: '100%',
  pr: 4,
  pb: 4,
} as const;

export const chartAxisStyles = {
  axisStroke: AXIS_STROKE,
  axisStrokeWidth: AXIS_STROKE_WIDTH,
  gridStroke: GRID_STROKE,
  tickFontSize: TICK_FONT_SIZE,
  tickFill: TICK_FILL,
  fontFamily: FONT_FAMILY,
} as const;

/**
 * Props to spread on CartesianGrid for subtle grid lines.
 * Horizontal lines only — vertical lines made the charts look busy/"foggy"
 * (modifications list #3); this matches the cleaner precipitation-cumul style.
 */
export const defaultCartesianGridProps = {
  stroke: GRID_STROKE,
  strokeDasharray: '3 3',
  strokeWidth: 1,
  strokeOpacity: 0.65,
  vertical: false,
  horizontal: true,
};

/** Left Y-axis unit label — outside the tick column so it is not covered by values. */
export function yAxisLabelInsideLeft(value: string, fill: string = TICK_FILL) {
  return {
    value,
    angle: -90,
    position: 'left' as const,
    style: {
      textAnchor: 'middle' as const,
      fontSize: AXIS_LABEL_FONT_PX,
      fill,
      fontWeight: 500,
      fontFamily: FONT_FAMILY,
    },
    offset: 6,
  };
}

/** Right Y-axis unit label — outside the tick column so it is not covered by values. */
export function yAxisLabelInsideRight(value: string, fill: string = TICK_FILL) {
  return {
    value,
    angle: 90,
    position: 'right' as const,
    style: {
      textAnchor: 'middle' as const,
      fontSize: AXIS_LABEL_FONT_PX,
      fill,
      fontWeight: 500,
      fontFamily: FONT_FAMILY,
    },
    offset: 18,
  };
}

/** Hover marker: no visible dots on the line; this shows only under the cursor. */
export const defaultActiveDot = {
  r: 6,
  strokeWidth: 2,
  fill: '#ffffff',
  stroke: '#64748b',
} as const;

/** activeDot that matches the series stroke (ring accent on hover). */
export function activeDotForSeries(strokeColor: string) {
  return {
    r: 6,
    strokeWidth: 2,
    fill: '#ffffff',
    stroke: strokeColor,
  } as const;
}

/**
 * Default Line props: smooth continuous line, no dots by default.
 * A single small marker appears only on hover (activeDot).
 */
export const defaultLineProps = {
  type: 'monotone' as const,
  dot: false,
  activeDot: defaultActiveDot,
  strokeWidth: 2.25,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/**
 * Default Bar props: rounded corners, no outline, modern density.
 * Spread this on Recharts <Bar /> for consistent styling.
 */
export const defaultBarProps = {
  radius: [10, 10, 4, 4] as [number, number, number, number],
  stroke: 'none',
  isAnimationActive: false,
} as const;

/** Legend wrapper style for centered placement below chart (use with Recharts Legend wrapperStyle). */
export const defaultLegendWrapperStyle = {
  paddingTop: 8,
  marginBottom: 0,
  display: 'flex',
  justifyContent: 'center',
  width: '100%',
} as const;

/** Short French month labels for axis ticks */
const MOIS_COURTS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];

/**
 * Format a timestamp for X-axis display as date + hour: "DD MMM HH:mm" (e.g. "12 Mar 14:00").
 * Ensures both date and time are visible on time-based charts.
 * @param value - ISO timestamp or date string
 */
export function formatXAxisTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getDate()} ${MOIS_COURTS[date.getMonth()]} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Format a timestamp for X-axis display as day + month (e.g. "12 mars"). */
export function formatXAxisDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${d.getDate()} ${MOIS_COURTS[d.getMonth()]}`;
}

const pad2 = (n: number) => n.toString().padStart(2, '0');

/**
 * When zoomed to a short window (e.g. one day), format X ticks like the soil graph mock:
 * - First tick: date only ("1 Jun")
 * - Middle ticks: time only ("00:00", "01:00", …)
 * - Last tick: date ("2 Jun") if the range crosses into another calendar day; otherwise time
 * - First tick of a new calendar day (vs previous tick): date label
 */
export function formatZoomedTimeAxisTick(
  value: string,
  allTicks: string[]
): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime()) || allTicks.length === 0) return String(value);

  let idx = allTicks.indexOf(value);
  if (idx === -1) {
    idx = allTicks.findIndex(
      (t) => Math.abs(new Date(t).getTime() - d.getTime()) < 1
    );
  }
  if (idx === -1) return formatXAxisTimestamp(value);

  const firstD = new Date(allTicks[0]);

  if (idx === 0) {
    return `${d.getDate()} ${MOIS_COURTS[d.getMonth()]}`;
  }

  if (idx === allTicks.length - 1) {
    const sameCalDayAsStart =
      d.getFullYear() === firstD.getFullYear() &&
      d.getMonth() === firstD.getMonth() &&
      d.getDate() === firstD.getDate();
    if (sameCalDayAsStart) {
      return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    }
    return `${d.getDate()} ${MOIS_COURTS[d.getMonth()]}`;
  }

  const prevD = new Date(allTicks[idx - 1]);
  const newCalendarDay =
    d.getDate() !== prevD.getDate() ||
    d.getMonth() !== prevD.getMonth() ||
    d.getFullYear() !== prevD.getFullYear();

  if (newCalendarDay) {
    return `${d.getDate()} ${MOIS_COURTS[d.getMonth()]}`;
  }

  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Same rules as {@link formatZoomedTimeAxisTick} for numeric `type="number"` X-axes (ms since epoch). */
export function formatZoomedTimeAxisTickMs(
  valueMs: number,
  allTicksMs: number[]
): string {
  const d = new Date(valueMs);
  if (Number.isNaN(d.getTime()) || allTicksMs.length === 0) return '';

  const idx = allTicksMs.findIndex((t) => Math.abs(t - valueMs) < 1);
  if (idx === -1) {
    return formatXAxisTimestamp(new Date(valueMs).toISOString());
  }

  const tickStrings = allTicksMs.map((ms) => new Date(ms).toISOString());
  return formatZoomedTimeAxisTick(new Date(valueMs).toISOString(), tickStrings);
}

/** Recharts category axes need exact string matches; use this + `type="number"` + {@link CHART_TIME_MS_KEY} for hourly ticks. */
export const CHART_TIME_MS_KEY = 'timeMs';

export function addTimeMsToChartRows<T extends object>(
  rows: T[],
  timestampKey: string
): Array<T & { [CHART_TIME_MS_KEY]: number }> {
  return rows.map((row) => {
    const raw = (row as Record<string, unknown>)[timestampKey];
    const ms =
      typeof raw === 'string' || typeof raw === 'number'
        ? new Date(raw).getTime()
        : NaN;
    return {
      ...row,
      [CHART_TIME_MS_KEY]: Number.isFinite(ms) ? ms : 0,
    };
  });
}

function getTimeMsRangeFromData(
  data: Array<object>,
  dataKey: string
): { minMs: number; maxMs: number } | null {
  const msList: number[] = [];
  for (const row of data) {
    const v = (row as Record<string, unknown>)[dataKey];
    if (v == null) continue;
    const ms = new Date(v as string | number).getTime();
    if (!Number.isNaN(ms)) msList.push(ms);
  }
  if (msList.length === 0) return null;
  return { minMs: Math.min(...msList), maxMs: Math.max(...msList) };
}

const axisLineStyle = {
  stroke: AXIS_STROKE,
  strokeWidth: AXIS_STROKE_WIDTH,
};

/** Visual props shared by category and numeric time X-axes */
function getTimeAxisVisualProps() {
  return {
    stroke: AXIS_STROKE,
    strokeWidth: AXIS_STROKE_WIDTH,
    tick: {
      fill: TICK_FILL,
      fontSize: TICK_FONT_SIZE,
      fontFamily: FONT_FAMILY,
    },
    axisLine: axisLineStyle,
    tickLine: axisLineStyle,
  };
}

/** Tooltip cursor: subtle vertical line on hover. */
export const defaultTooltipCursor = { stroke: GRID_STROKE, strokeWidth: 1 };

/**
 * Create an X-axis tick formatter for time-based data.
 * Formats each tick as "DD MMM HH:mm" (e.g. "12 Mar 14:00").
 */
export function createXAxisTimeFormatter(
  _data: Array<object>,
  _dataKey: string = 'timestamp'
): (value: string) => string {
  return (value: string) => formatXAxisTimestamp(value);
}

/**
 * Format period strings (e.g. "2024-01-15", "2024-W03") for X-axis when not full timestamp.
 */
export function formatXAxisPeriod(value: string): string {
  if (!value) return value;
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getDate()} ${MOIS_COURTS[d.getMonth()]}`;
  }
  return value;
}

/**
 * Y-axis tick formatter: 1–2 decimals, no floating-point artifacts.
 */
export function formatYAxisTick(value: number, decimals: number = 2): string {
  if (value == null || Number.isNaN(value)) return '—';
  return formatNumber(value, decimals);
}

/**
 * Default XAxis props for time-based charts (dataKey timestamp or name).
 * Use tickFormatter with createXAxisTimeFormatter(data, dataKey).
 */
/**
 * Default XAxis props for time-based charts: shows date + hour (e.g. "12 Mar 14:00").
 * Use margin {{ bottom: 40 }} or more so rotated labels fit. dataKey is 'timestamp' or 'name'.
 */
export function getDefaultXAxisProps(
  data: Array<object>,
  dataKey: string = 'timestamp'
) {
  return {
    stroke: AXIS_STROKE,
    strokeWidth: AXIS_STROKE_WIDTH,
    tick: {
      fill: TICK_FILL,
      fontSize: TICK_FONT_SIZE,
      fontFamily: FONT_FAMILY,
    },
    axisLine: { stroke: AXIS_STROKE, strokeWidth: AXIS_STROKE_WIDTH },
    tickLine: { stroke: AXIS_STROKE, strokeWidth: AXIS_STROKE_WIDTH },
    tickFormatter: createXAxisTimeFormatter(data, dataKey),
    angle: -22,
    textAnchor: 'end' as const,
    interval: 'preserveStartEnd' as const,
    minTickGap: 28,
  };
}

export type AdaptiveTimeXAxisOptions = {
  /** Optional slice of `data` (by index) used to compute visible time span for tick density. */
  startIndex?: number;
  endIndex?: number;
  /** Show day + hour on axis when visible span is ≤ this many hours (narrow dragger window). Default: 10 days. */
  zoomThresholdHours?: number;
};

/** Hourly (or stepped) tick positions in ms for Recharts `type="number"` X-axis. */
function generateTimeTicksMs(
  startMs: number,
  endMs: number,
  stepMs: number
): number[] {
  const step = Math.max(stepMs, 60 * 60 * 1000);
  const ticks: number[] = [];
  for (let t = startMs; t <= endMs; t += step) {
    ticks.push(t);
  }
  if (ticks.length === 0 || ticks[ticks.length - 1] < endMs) {
    if (ticks.length === 0 || ticks[ticks.length - 1] !== endMs) {
      ticks.push(endMs);
    }
  }
  return ticks;
}

/**
 * Sorted unique timestamps (ms) from rows — same instants as plotted points.
 * Prefer `timeMs` when present (same value the Line uses on the X axis) so it always
 * matches Recharts’ tooltip resolution; avoids ISO re-parse drift vs `timeMs`.
 */
function getSortedUniqueTimeMsFromData(
  data: Array<object>,
  dataKey: string
): number[] {
  const set = new Set<number>();
  for (const row of data) {
    const rec = row as Record<string, unknown>;
    const msFromRow = rec[CHART_TIME_MS_KEY];
    if (typeof msFromRow === 'number' && Number.isFinite(msFromRow)) {
      set.add(msFromRow);
      continue;
    }
    const raw = rec[dataKey];
    const ms =
      typeof raw === 'string' || typeof raw === 'number'
        ? new Date(raw).getTime()
        : NaN;
    if (Number.isFinite(ms)) set.add(ms);
  }
  return Array.from(set).sort((a, b) => a - b);
}

/** True if any two consecutive samples are closer than 24h (hourly / sub-daily series). */
function hasSubDailySampleSpacing(sortedUniqueMs: number[]): boolean {
  if (sortedUniqueMs.length < 2) return false;
  const dayMs = 24 * 60 * 60 * 1000;
  for (let i = 1; i < sortedUniqueMs.length; i++) {
    if (sortedUniqueMs[i] - sortedUniqueMs[i - 1] < dayMs) {
      return true;
    }
  }
  return false;
}

function mergeSortedUniqueMs(...lists: number[][]): number[] {
  const set = new Set<number>();
  for (const list of lists) {
    for (const n of list) {
      if (Number.isFinite(n)) set.add(n);
    }
  }
  return Array.from(set).sort((a, b) => a - b);
}

/**
 * Adaptive X-axis for time-series:
 * - Wide windows: category axis, "DD MMM"
 * - Zoomed/small windows: **numeric** `timeMs` axis so hourly ticks render (Recharts category axes ignore mismatched tick strings)
 */
export function getAdaptiveTimeXAxisProps(
  data: Array<object>,
  dataKey: string = 'timestamp',
  options: AdaptiveTimeXAxisOptions = {}
) {
  const visual = getTimeAxisVisualProps();
  /** Narrower default so dragger / short windows pick up day+hour ticks sooner (aligned with soil chart UX). */
  const zoomThresholdHours = options.zoomThresholdHours ?? 24 * 7;
  const thresholdMs = zoomThresholdHours * 60 * 60 * 1000;
  /** Use numeric time axis for sub-daily data up to ~1 month (not only ≤7 days). */
  const maxSubDailySpanMs = 31 * 24 * 60 * 60 * 1000;

  const range = getTimeMsRangeFromData(data, dataKey);
  const spanMs = range ? range.maxMs - range.minMs : Number.POSITIVE_INFINITY;
  const uniqueMs = getSortedUniqueTimeMsFromData(data, dataKey);
  const subDaily = uniqueMs.length >= 2 && hasSubDailySampleSpacing(uniqueMs);
  const zoomed =
    range != null &&
    data.length > 0 &&
    (spanMs <= thresholdMs || (subDaily && spanMs <= maxSubDailySpanMs));

  if (zoomed && range) {
    const { minMs, maxMs } = range;
    const spanHours = spanMs / (60 * 60 * 1000);
    const stepHours =
      spanHours <= 12
        ? 1
        : spanHours <= 24
          ? 2
          : spanHours <= 48
            ? 3
            : spanHours <= 96
              ? 4
              : 6;
    const stepMsVal = stepHours * 60 * 60 * 1000;
    /** Visual tick cadence only (does not include every sample time). */
    const sparseTicksMs = generateTimeTicksMs(minMs, maxMs, stepMsVal);
    /**
     * Every real sample `timeMs` must be a tick value: sparse steps alone miss sample
     * times (e.g. across midnight). Merging does not add data points.
     */
    const dataTimeMs = uniqueMs;
    const ticksMs = mergeSortedUniqueMs(sparseTicksMs, dataTimeMs);
    const sparseLabelSet = new Set(sparseTicksMs);

    let domainMin = minMs;
    let domainMax = maxMs;
    if (domainMin === domainMax) {
      const pad = 60 * 60 * 1000;
      domainMin -= pad;
      domainMax += pad;
    } else {
      /** Edge padding keeps time-aligned bars (numeric X) inside the clip on zoom. */
      const span = domainMax - domainMin;
      const pad = Math.min(
        Math.max(span * 0.04, 30 * 60 * 1000),
        24 * 60 * 60 * 1000
      );
      domainMin -= pad;
      domainMax += pad;
    }

    return {
      ...visual,
      type: 'number' as const,
      dataKey: CHART_TIME_MS_KEY,
      domain: [domainMin, domainMax] as [number, number],
      ticks: ticksMs,
      tickFormatter: (v: number) =>
        sparseLabelSet.has(v) ? formatZoomedTimeAxisTickMs(v, ticksMs) : '',
      allowDecimals: false,
      interval: 0,
      minTickGap: 0,
      angle: -35,
      textAnchor: 'end' as const,
    };
  }

  const base = getDefaultXAxisProps(data, dataKey);
  /** Wide window but sub-daily samples: show date+hour like zoomed detail (still category axis). */
  const tickFormatter = (v: string) =>
    subDaily ? formatXAxisTimestamp(v) : formatXAxisDate(v);
  return {
    ...base,
    dataKey,
    tickFormatter,
    interval: 'preserveStartEnd' as const,
    minTickGap: subDaily ? 20 : 36,
    angle: subDaily ? -28 : 0,
    textAnchor: (subDaily ? 'end' : 'middle') as 'end' | 'middle',
  };
}

/**
 * XAxis props for period-based charts (e.g. period = "2024-01-15" or "2024-W03").
 */
export function getPeriodXAxisProps() {
  return {
    stroke: AXIS_STROKE,
    strokeWidth: AXIS_STROKE_WIDTH,
    tick: {
      fill: TICK_FILL,
      fontSize: TICK_FONT_SIZE,
      fontFamily: FONT_FAMILY,
    },
    axisLine: { stroke: AXIS_STROKE, strokeWidth: AXIS_STROKE_WIDTH },
    tickLine: { stroke: AXIS_STROKE, strokeWidth: AXIS_STROKE_WIDTH },
    tickFormatter: formatXAxisPeriod,
    interval: 'preserveStartEnd' as const,
    minTickGap: 24,
  };
}

/**
 * Default YAxis props. decimals: 1–2 for readable numeric ticks (no unit on ticks; use YAxis label for unit).
 */
export function getDefaultYAxisProps(decimals: number = 2) {
  return {
    stroke: AXIS_STROKE,
    strokeWidth: AXIS_STROKE_WIDTH,
    tick: {
      fill: TICK_FILL,
      fontSize: TICK_FONT_SIZE,
      fontFamily: FONT_FAMILY,
    },
    axisLine: { stroke: AXIS_STROKE, strokeWidth: AXIS_STROKE_WIDTH },
    tickLine: { stroke: AXIS_STROKE, strokeWidth: AXIS_STROKE_WIDTH },
    tickFormatter: (v: number) => formatYAxisTick(v, decimals),
    width: 48,
    tickMargin: 8,
  };
}

/**
 * Apply light/dark axis stroke and tick fill while preserving angle, formatter, etc.
 * Use with {@link getAdaptiveTimeXAxisProps} and {@link getDefaultYAxisProps}.
 */
export function mergeAxisTheme<T extends Record<string, unknown>>(
  props: T,
  axisStroke: string,
  tickFill: string
): T {
  const baseTick = {
    fill: tickFill,
    fontSize: TICK_FONT_SIZE,
    fontFamily: FONT_FAMILY,
  };
  const existingTick = props.tick;
  const mergedTick =
    existingTick &&
    typeof existingTick === 'object' &&
    !Array.isArray(existingTick) &&
    existingTick !== null
      ? { ...baseTick, ...(existingTick as Record<string, unknown>) }
      : baseTick;

  return {
    ...props,
    stroke: axisStroke,
    tick: mergedTick,
    axisLine: { stroke: axisStroke, strokeWidth: AXIS_STROKE_WIDTH },
    tickLine: { stroke: axisStroke, strokeWidth: AXIS_STROKE_WIDTH },
  };
}

/** Theme-aware grid stroke; keeps dash and opacity from {@link defaultCartesianGridProps}. */
export function themedCartesianGrid(gridStroke: string) {
  return {
    ...defaultCartesianGridProps,
    stroke: gridStroke,
  };
}

/** Caps bar thickness on time-based BarCharts so narrow dragger windows do not overflow the clip. */
export function maxBarSizeForPointCount(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 24;
  if (n <= 1) return 20;
  if (n <= 3) return 28;
  if (n <= 10) return 40;
  if (n <= 24) return 48;
  return 56;
}
