/**
 * Brand and semantic color palette.
 * Single source of truth — consumed by tailwind.config.ts and antdTheme.ts.
 *
 * The 50–900 scale follows the Material/Tailwind convention so it maps
 * cleanly to both Tailwind utilities (`bg-primary-500`) and AntD tokens
 * (`colorPrimary` = primary[600]).
 *
 * Palette: "Agrilogy Forest" — a calibrated forest-green tuned for an
 * agriculture brand. The 600 step (brand primary) hits WCAG AA on white
 * (~6.0:1); the 400 step works as the brand primary in dark mode.
 */

export const primary = {
  50: '#eef9f1',
  100: '#d6f0dd',
  200: '#aee0bd',
  300: '#7ecb98',
  400: '#4cae70',
  500: '#2e924f',
  600: '#1f7740', // brand primary (light mode)
  700: '#175e33',
  800: '#114828',
  900: '#0c331c',
} as const;

export const neutral = {
  0: '#ffffff',
  50: '#f7f9f8',
  100: '#eef2f0',
  200: '#dde4e0',
  300: '#c1ccc6',
  400: '#8e9a94',
  500: '#647069',
  600: '#475149',
  700: '#323a34',
  800: '#1f2521',
  900: '#121613',
  1000: '#000000',
} as const;

export const semantic = {
  success: '#2e924f',
  warning: '#d97706',
  danger: '#dc2626',
  info: '#0284c7',
} as const;

export const surface = {
  page: neutral[50],
  card: neutral[0],
  inverse: neutral[900],
} as const;

export const text = {
  primary: neutral[900],
  secondary: neutral[600],
  muted: neutral[400],
  inverse: neutral[0],
} as const;

export const border = {
  subtle: neutral[200],
  default: neutral[300],
  strong: neutral[400],
} as const;

/**
 * Chart series palette — the named colours used for per-sensor line/bar/area
 * series across the analytics charts.
 *
 * Values are the historical hex literals that were previously hard-coded in the
 * individual chart components; they are intentionally kept identical so the
 * tokenisation is a pure refactor with no visual change. Consume these via
 * {@link colorForSensor} (in `@agri/ui`) rather than reaching for a raw hex.
 */
export const chartSeries = {
  /** Default single-series green (wind speed, water flow/pH/EC, fruit size, …). */
  green: '#82ca9d',
  /** Leaf temperature. */
  orange: '#ff7300',
  /** Leaf moisture. */
  azure: '#007aff',
  /** Soil-water flow line. */
  cobalt: '#2563eb',
  /** Soil-water flow bar fill. */
  cobaltFill: '#416bdf',
  /** Low soil-humidity probe. */
  burntOrange: '#ea580c',
  /** High soil-humidity probe. */
  amber: '#ffc658',
  /** Solar radiation. */
  sun: '#f6c90e',
  /** Water level / VPD / soil-temp low / ET0 sensor. */
  blue: '#3182ce',
  /** Soil-temp medium probe. */
  forest: '#2f855a',
  /** Soil-temp high probe / ET0 calculated. */
  red: '#e53e3e',
  /** Soil-conductivity low probe. */
  brightBlue: '#1e88e5',
  /** Soil-conductivity high probe. */
  emerald: '#2bb673',
  /** Soil-conductivity irrigation flow fill. */
  skyBlue: '#00b0ff',
  /** Air temperature. */
  gold: '#d69e2e',
  /** Air humidity. */
  teal: '#2c7a7b',
  /** Dew point. */
  indigo: '#6366f1',
  /** Precipitation rate (light mode). */
  rain: '#3b82f6',
  /** Precipitation rate (dark mode). */
  rainDark: '#60a5fa',
  /** NPK nitrogen / soil salinity fallback. */
  mustard: '#dba800',
  /** NPK phosphorus / soil conductivity fallback. */
  jade: '#00a86b',
  /** NPK potassium. */
  steelBlue: '#4682b4',
} as const;

/**
 * Wind-rose speed-bin palette — ordered low→high wind-speed buckets on the
 * radar chart. Kept as the original Highcharts-style hues (no visual change).
 */
export const chartWindRose = [
  '#7cb5ec',
  '#434348',
  '#90ed7d',
  '#f7a35c',
  '#8085e9',
] as const;

export const chart = {
  series: chartSeries,
  windRose: chartWindRose,
} as const;

export const colors = {
  primary,
  neutral,
  semantic,
  surface,
  text,
  border,
  chart,
} as const;

export type ColorTokens = typeof colors;
