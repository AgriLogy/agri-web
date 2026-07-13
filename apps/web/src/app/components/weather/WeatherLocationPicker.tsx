'use client';

import React, { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Box,
  Button,
  HStack,
  Icon,
  Input,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Spinner,
  Text,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';
import { MapPin, LocateFixed } from 'lucide-react';
import {
  readWeatherLocation,
  writeWeatherLocation,
  clearWeatherLocation,
  WEATHER_LOCATION_UPDATED_EVENT,
  type WeatherLocation,
} from '@agri/api-client/weatherLocationStorage';

interface GeoResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

const geoLang = (locale: string): string =>
  locale === 'ar' ? 'ar' : locale === 'en' ? 'en' : 'fr';

// Default station coordinates the forecast falls back to when nothing is picked.
const STATION_LAT = 32.906323;
const STATION_LON = -6.93442;

const DEFAULT_LOCATION: WeatherLocation = {
  lat: STATION_LAT,
  lon: STATION_LON,
  label: null,
};

interface WeatherLocationPickerProps {
  /** Fired after the saved location changes (search pick / reset / geolocate). */
  onChange?: (location: WeatherLocation) => void;
  /** Trigger button size. */
  size?: 'xs' | 'sm';
}

/**
 * Self-service weather-location picker: a compact popover with browser
 * geolocation, a debounced Open-Meteo city search, and a reset-to-station link.
 * Persists the choice via the shared weather-location storage (localStorage +
 * `WEATHER_LOCATION_UPDATED_EVENT`), so every consumer of the location —
 * the weather dashboard, the ET₀ forecast card, the ET₀ chart — stays in sync.
 */
const WeatherLocationPicker = ({
  onChange,
  size = 'xs',
}: WeatherLocationPickerProps) => {
  const t = useTranslations();
  const locale = useLocale();

  const [location, setLocation] = useState<WeatherLocation>(DEFAULT_LOCATION);
  const [cityName, setCityName] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const bgColor = useColorModeValue('white', 'gray.800');
  const primaryText = useColorModeValue('gray.900', 'white');
  const secondaryText = useColorModeValue('gray.600', 'gray.400');
  const popoverBorder = useColorModeValue('gray.200', 'gray.600');
  const resultHoverBg = useColorModeValue('gray.100', 'gray.700');

  // Hydrate the saved location on the client (avoids an SSR mismatch) and stay
  // in sync when another picker instance changes it.
  useEffect(() => {
    const sync = () => setLocation(readWeatherLocation() ?? DEFAULT_LOCATION);
    sync();
    window.addEventListener(WEATHER_LOCATION_UPDATED_EVENT, sync);
    return () =>
      window.removeEventListener(WEATHER_LOCATION_UPDATED_EVENT, sync);
  }, []);

  // Resolve the display label: a user-picked label wins; otherwise
  // reverse-geocode the coordinates (keyless endpoint, best-effort).
  useEffect(() => {
    if (location.label) {
      setCityName(location.label);
      return;
    }
    let cancelled = false;
    fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${location.lat}&longitude=${location.lon}&localityLanguage=${geoLang(locale)}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setCityName(
          data?.city ||
            data?.locality ||
            data?.principalSubdivision ||
            data?.countryName ||
            null
        );
      })
      .catch(() => {
        /* city label is best-effort; ignore failures */
      });
    return () => {
      cancelled = true;
    };
  }, [location.lat, location.lon, location.label, locale]);

  // Debounced city search via open-meteo's keyless geocoding API.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=${geoLang(locale)}&format=json`
      )
        .then((r) => r.json())
        .then((data) =>
          setResults(Array.isArray(data?.results) ? data.results : [])
        )
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(handle);
  }, [query, locale]);

  const commit = (loc: WeatherLocation, persist: () => void) => {
    setLocation(loc);
    persist();
    onChange?.(loc);
    setPickerOpen(false);
    setQuery('');
    setResults([]);
  };

  const pickLocation = (r: GeoResult) => {
    const loc: WeatherLocation = {
      lat: r.latitude,
      lon: r.longitude,
      label: r.name,
    };
    commit(loc, () => writeWeatherLocation(loc));
  };

  const resetLocation = () =>
    commit(DEFAULT_LOCATION, () => clearWeatherLocation());

  // Browser geolocation → anchor the forecast to the device's position. label
  // stays null so the reverse-geocode effect resolves the city name.
  const useMyLocation = () => {
    setGeoError(null);
    if (!('geolocation' in navigator)) {
      setGeoError(t('shell.weather.geoUnavailable'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const loc: WeatherLocation = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          label: null,
        };
        commit(loc, () => writeWeatherLocation(loc));
      },
      (err) => {
        setLocating(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? t('shell.weather.geoDenied')
            : t('shell.weather.geoUnavailable')
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  return (
    <Popover
      isOpen={pickerOpen}
      onOpen={() => setPickerOpen(true)}
      onClose={() => setPickerOpen(false)}
      placement="bottom-start"
      isLazy
    >
      <PopoverTrigger>
        <Button
          variant="ghost"
          size={size}
          px={1}
          py={0}
          h="auto"
          minH="20px"
          fontWeight="normal"
          color={secondaryText}
          leftIcon={<Icon as={MapPin} boxSize="13px" />}
          _hover={{ color: primaryText, bg: 'transparent' }}
          aria-label={t('shell.weather.changeLocation')}
        >
          {cityName || t('shell.weather.changeLocation')}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        w="250px"
        bg={bgColor}
        borderColor={popoverBorder}
        boxShadow="lg"
        _focus={{ outline: 'none' }}
      >
        <PopoverArrow bg={bgColor} />
        <PopoverBody>
          <Button
            size="xs"
            w="100%"
            mb={2}
            variant="outline"
            leftIcon={<Icon as={LocateFixed} boxSize="12px" />}
            isLoading={locating}
            loadingText={t('shell.weather.locating')}
            onClick={useMyLocation}
          >
            {t('shell.weather.useMyLocation')}
          </Button>
          {geoError && (
            <Text fontSize="xs" color="red.400" px={1} mb={2}>
              {geoError}
            </Text>
          )}
          <Input
            size="sm"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('shell.weather.searchPlaceholder')}
            mb={2}
          />
          {searching && (
            <HStack spacing={2} px={1} py={1}>
              <Spinner size="xs" color="primary.500" />
              <Text fontSize="xs" color={secondaryText}>
                {t('shell.weather.searching')}
              </Text>
            </HStack>
          )}
          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <Text fontSize="xs" color={secondaryText} px={1} py={1}>
              {t('shell.weather.noResults')}
            </Text>
          )}
          <VStack align="stretch" spacing={0} maxH="190px" overflowY="auto">
            {results.map((r) => (
              <Box
                as="button"
                type="button"
                key={r.id}
                textAlign="start"
                px={2}
                py="6px"
                borderRadius="md"
                _hover={{ bg: resultHoverBg }}
                onClick={() => pickLocation(r)}
              >
                <Text fontSize="sm" color={primaryText} noOfLines={1}>
                  {r.name}
                </Text>
                <Text fontSize="xs" color={secondaryText} noOfLines={1}>
                  {[r.admin1, r.country].filter(Boolean).join(', ')}
                </Text>
              </Box>
            ))}
          </VStack>
          <Button
            variant="link"
            size="xs"
            mt={2}
            colorScheme="brand"
            leftIcon={<Icon as={MapPin} boxSize="12px" />}
            onClick={resetLocation}
          >
            {t('shell.weather.resetStation')}
          </Button>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

export default WeatherLocationPicker;
