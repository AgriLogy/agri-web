/**
 * City name for a point, from BigDataCloud's keyless reverse-geocoding
 * endpoint. Best-effort: resolves to null on any failure.
 *
 * The weather card and its location picker both need this label for the
 * same point; one shared, memoised request per (point, language) replaces
 * the two identical calls they used to make.
 */

export const geoLang = (locale: string): string =>
  locale === 'ar' ? 'ar' : locale === 'en' ? 'en' : 'fr';

const cache = new Map<string, Promise<string | null>>();

export function reverseGeocodeCity(
  lat: number,
  lon: number,
  locale: string
): Promise<string | null> {
  const lang = geoLang(locale);
  const key = `${lat},${lon},${lang}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${lang}`
    )
      .then((r) => r.json())
      .then(
        (data) =>
          data?.city ||
          data?.locality ||
          data?.principalSubdivision ||
          data?.countryName ||
          null
      )
      .catch(() => {
        // Forget failures so a later render can try again.
        cache.delete(key);
        return null;
      });
    cache.set(key, pending);
  }
  return pending;
}

/** Test hook: drop memoised answers. */
export function clearReverseGeocodeCache(): void {
  cache.clear();
}
