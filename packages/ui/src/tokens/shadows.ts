/**
 * Elevation tokens. Use `card` for default surfaces, `floating` for
 * popovers / dropdowns, `overlay` for modals.
 */

export const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(15, 23, 42, 0.06)',
  card: '0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)',
  floating:
    '0 6px 16px rgba(15, 23, 42, 0.08), 0 3px 6px rgba(15, 23, 42, 0.04)',
  overlay: '0 24px 48px rgba(15, 23, 42, 0.18)',
} as const;

export type ShadowTokens = typeof shadows;
