/**
 * Border-radius scale. `pill` for full circles/capsules.
 */

export const radii = {
  none: '0',
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.5rem',
  '3xl': '2rem',
  pill: '9999px',
} as const;

export type RadiiTokens = typeof radii;
