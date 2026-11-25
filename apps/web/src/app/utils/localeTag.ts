/**
 * The BCP-47 tag used to format dates and times for the app's UI locale.
 * Pass it to `toLocaleDateString` / `toLocaleTimeString` instead of letting
 * the browser's own language decide (an Arabic UI on a French phone must
 * still show Arabic dates).
 */
export const localeTag = (locale: string): string =>
  locale === 'ar' ? 'ar' : locale === 'en' ? 'en-GB' : 'fr-FR';
