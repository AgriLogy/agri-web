/**
 * Format a number with up to a maximum number of decimal places to avoid
 * floating-point display artifacts (e.g. 0.30000000004).
 * Rounds to at most `decimals` places and trims trailing zeros.
 * @param value - Numeric value (can be from sensor/API)
 * @param decimals - Maximum decimal places (default 2)
 * @returns Formatted string suitable for display (trailing zeros stripped)
 */
export function formatNumber(value: number, decimals: number = 2): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—';
  }
  const factor = Math.pow(10, decimals);
  const rounded = Math.round(value * factor) / factor;
  const fixed = rounded.toFixed(decimals);
  if (!fixed.includes('.')) return fixed;
  return fixed.replace(/\.?0+$/, '');
}

/**
 * Same as formatNumber but returns a number (for chart values / calculations
 * that must stay numeric but be rounded).
 */
export function roundNumber(value: number, decimals: number = 2): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
