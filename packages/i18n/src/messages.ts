import type { Locale } from './config';

export async function getMessages(locale: Locale | string) {
  return (await import(`./messages/${locale}.json`)).default;
}
