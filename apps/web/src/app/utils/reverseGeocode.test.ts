/**
 * The weather card and its location picker share one reverse-geocoding
 * request per point and language (they used to make two identical calls).
 */
import {
  clearReverseGeocodeCache,
  geoLang,
  reverseGeocodeCity,
} from './reverseGeocode';
import { localeTag } from './localeTag';

const fetchMock = jest.fn();

beforeEach(() => {
  clearReverseGeocodeCache();
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

const reply = (body: unknown) =>
  Promise.resolve({ json: () => Promise.resolve(body) });

it('asks once for the same point and language', async () => {
  fetchMock.mockReturnValue(reply({ city: 'Commune démo' }));
  const [a, b] = await Promise.all([
    reverseGeocodeCity(32.9, -6.9, 'fr'),
    reverseGeocodeCity(32.9, -6.9, 'fr'),
  ]);
  expect(a).toBe('Commune démo');
  expect(b).toBe('Commune démo');
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toContain('localityLanguage=fr');
});

it('asks again for another language', async () => {
  fetchMock.mockReturnValue(reply({ city: 'x' }));
  await reverseGeocodeCity(32.9, -6.9, 'fr');
  await reverseGeocodeCity(32.9, -6.9, 'ar');
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('falls back from city to locality, region, country', async () => {
  fetchMock.mockReturnValue(reply({ principalSubdivision: 'Région démo' }));
  await expect(reverseGeocodeCity(1, 2, 'en')).resolves.toBe('Région démo');
});

it('returns null on failure and retries next time', async () => {
  fetchMock.mockReturnValueOnce(Promise.reject(new Error('offline')));
  await expect(reverseGeocodeCity(1, 2, 'fr')).resolves.toBeNull();
  fetchMock.mockReturnValueOnce(reply({ city: 'Ville' }));
  await expect(reverseGeocodeCity(1, 2, 'fr')).resolves.toBe('Ville');
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('maps UI locales to geocoder and date-format tags', () => {
  expect(geoLang('ar')).toBe('ar');
  expect(geoLang('en')).toBe('en');
  expect(geoLang('fr')).toBe('fr');
  expect(localeTag('ar')).toBe('ar');
  expect(localeTag('en')).toBe('en-GB');
  expect(localeTag('fr')).toBe('fr-FR');
});
