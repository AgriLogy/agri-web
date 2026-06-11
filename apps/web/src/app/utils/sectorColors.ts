export const SECTOR_FILL_PALETTE = [
  '#2d8a54',
  '#c9a227',
  '#3b82c4',
  '#c44c6a',
  '#7c5cbf',
  '#d97706',
  '#0d9488',
  '#b45309',
  '#6366f1',
  '#db2777',
  '#16a34a',
  '#ca8a04',
  '#2563eb',
  '#dc2626',
  '#9333ea',
] as const;

export function colorForSectorIndex(index: number): string {
  return SECTOR_FILL_PALETTE[index % SECTOR_FILL_PALETTE.length]!;
}

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value);
}
