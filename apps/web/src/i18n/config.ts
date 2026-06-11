// Supported UI locales. FR is the default; AR renders right-to-left.
export const locales = ['fr', 'en', 'ar'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'fr';

// Cookie used to persist the chosen locale (no URL routing — keeps the
// authenticated dashboard routes untouched).
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export const rtlLocales: readonly Locale[] = ['ar'];

export function isRtl(locale: string): boolean {
  return (rtlLocales as readonly string[]).includes(locale);
}

export function dirFor(locale: string): 'rtl' | 'ltr' {
  return isRtl(locale) ? 'rtl' : 'ltr';
}

// Human-readable names shown in the language switcher.
export const localeNames: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
  ar: 'العربية',
};
