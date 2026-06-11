import dayjs from 'dayjs';

const FORMAT = 'D MMMM YYYY';

/**
 * Compose the muted line under a PageInfoBar title. Returns a single
 * sentence, e.g. "Zone Maraîchage 1 · du 14 au 21 mai 2026".
 * Either argument can be missing while data loads; the function never
 * throws and silently omits the missing half.
 *
 * Pass an optional `t` (a next-intl translator) so the "from … to …"
 * range wording is localised. The translation key is
 * `shell.pageSubtitle.range` with ICU placeholders {start} and {end}.
 * Without `t`, the function falls back to the French wording so existing
 * callers keep working.
 */
export function pageSubtitle(args: {
  zoneName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  t?: (key: string, values?: Record<string, string>) => string;
}): string | undefined {
  const { zoneName, startDate, endDate, t } = args;
  const parts: string[] = [];
  if (zoneName) parts.push(zoneName);
  if (startDate && endDate) {
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    if (start.isValid() && end.isValid()) {
      const startStr = start.format(FORMAT);
      const endStr = end.format(FORMAT);
      parts.push(
        t
          ? t('shell.pageSubtitle.range', { start: startStr, end: endStr })
          : `du ${startStr} au ${endStr}`
      );
    }
  }
  return parts.length ? parts.join(' · ') : undefined;
}
