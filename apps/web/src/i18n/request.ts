import { getRequestConfig } from 'next-intl/server';
import { getUserLocale } from './locale';

// Loads the active locale (from cookie) and its message catalog for every
// server render. Wired into next.config via createNextIntlPlugin().
export default getRequestConfig(async () => {
  const locale = await getUserLocale();
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
