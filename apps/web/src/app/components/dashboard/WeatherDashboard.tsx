'use client';

import React, { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Box,
  VStack,
  Text,
  useColorModeValue,
  useBreakpointValue,
  Switch,
  Grid,
  SimpleGrid,
  HStack,
  Icon,
  Flex,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
  Input,
  Button,
  Spinner,
} from '@chakra-ui/react';
import {
  Cloud,
  Sun,
  CloudRain,
  Wind,
  Droplets,
  Sunrise,
  Sunset,
  MapPin,
  LocateFixed,
} from 'lucide-react';
import {
  readWeatherLocation,
  writeWeatherLocation,
  clearWeatherLocation,
  type WeatherLocation,
} from '@agri/api-client/weatherLocationStorage';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import Loading from '../common/Loading';

interface WeatherData {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise: string[];
    sunset: string[];
  };
}

interface GeoResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

const localeTag = (locale: string): string =>
  locale === 'ar' ? 'ar' : locale === 'en' ? 'en-GB' : 'fr-FR';

const geoLang = (locale: string): string =>
  locale === 'ar' ? 'ar' : locale === 'en' ? 'en' : 'fr';

// Default station coordinates the forecast is anchored to.
const STATION_LAT = 32.906323;
const STATION_LON = -6.93442;

const DEFAULT_LOCATION: WeatherLocation = {
  lat: STATION_LAT,
  lon: STATION_LON,
  label: null,
};

const WeatherDashboard = () => {
  const t = useTranslations();
  const locale = useLocale();
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [cityName, setCityName] = useState<string | null>(null);
  const [location, setLocation] = useState<WeatherLocation>(DEFAULT_LOCATION);
  const [loading, setLoading] = useState(true);
  const [useImperial, setUseImperial] = useState(false);

  // Location-picker state.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const bgColor = useColorModeValue('white', 'gray.800');
  const primaryText = useColorModeValue('gray.900', 'white');
  const secondaryText = useColorModeValue('gray.600', 'gray.400');
  const tableBg = useColorModeValue('white', 'gray.800');
  const popoverBorder = useColorModeValue('gray.200', 'gray.600');
  const resultHoverBg = useColorModeValue('gray.100', 'gray.700');
  const p = useBreakpointValue({ base: 2, md: 4 });
  const { hoverColor } = useColorModeStyles();

  // Hydrate the saved location once on the client (avoids an SSR mismatch).
  useEffect(() => {
    const saved = readWeatherLocation();
    if (saved) setLocation(saved);
  }, []);

  // Fetch the forecast whenever the location changes. Keep the previous card
  // visible while refetching (no full-card spinner after the first load).
  useEffect(() => {
    let cancelled = false;
    const fetchWeather = async () => {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast/?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto&temperature_unit=celsius`
        );
        const data = await response.json();
        if (!cancelled) setWeatherData(data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchWeather();
    return () => {
      cancelled = true;
    };
  }, [location.lat, location.lon]);

  // Resolve the city label: a user-picked label wins; otherwise reverse-geocode
  // the coordinates (keyless endpoint, best-effort).
  useEffect(() => {
    if (location.label) {
      setCityName(location.label);
      return;
    }
    let cancelled = false;
    const fetchCity = async () => {
      try {
        const res = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${location.lat}&longitude=${location.lon}&localityLanguage=${geoLang(locale)}`
        );
        const data = await res.json();
        if (cancelled) return;
        setCityName(
          data?.city ||
            data?.locality ||
            data?.principalSubdivision ||
            data?.countryName ||
            null
        );
      } catch {
        /* city label is best-effort; ignore failures */
      }
    };
    fetchCity();
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
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=${geoLang(locale)}&format=json`
        );
        const data = await res.json();
        setResults(Array.isArray(data?.results) ? data.results : []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [query, locale]);

  const pickLocation = (r: GeoResult) => {
    const loc: WeatherLocation = {
      lat: r.latitude,
      lon: r.longitude,
      label: r.name,
    };
    setLocation(loc);
    writeWeatherLocation(loc);
    setPickerOpen(false);
    setQuery('');
    setResults([]);
  };

  const resetLocation = () => {
    setLocation(DEFAULT_LOCATION);
    clearWeatherLocation();
    setPickerOpen(false);
    setQuery('');
    setResults([]);
  };

  // Browser geolocation → anchor the forecast to the device's position.
  // label stays null so the reverse-geocode effect resolves the city name.
  const useMyLocation = () => {
    setGeoError(null);
    if (!('geolocation' in navigator)) {
      setGeoError(t('shell.weather.geoUnavailable'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: WeatherLocation = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          label: null,
        };
        setLocation(loc);
        writeWeatherLocation(loc);
        setLocating(false);
        setPickerOpen(false);
        setQuery('');
        setResults([]);
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

  const toFahrenheit = (celsius: number) => (celsius * 9) / 5 + 32;
  const toMilesPerHour = (kmph: number) => kmph * 0.621371;

  const handleUnitToggle = () => {
    setUseImperial((prevState) => !prevState);
  };

  const getWeatherIcon = (code: number) => {
    switch (code) {
      case 0:
        return <Icon as={Sun} color="yellow.500" />;
      case 1:
        return <Icon as={Sun} color="yellow.400" />;
      case 2:
      case 3:
        return <Icon as={Cloud} color="gray.500" />;
      default:
        return <Icon as={CloudRain} color="primary.500" />;
    }
  };

  const formatTime = (time: string) =>
    new Date(time).toLocaleTimeString(localeTag(locale), {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString(localeTag(locale), { weekday: 'short' });

  if (loading) {
    return <Loading />;
  }

  if (!weatherData) return null;

  const { current, daily } = weatherData;

  return (
    <Box bg={tableBg} p={p} width="100%" borderRadius="md" boxShadow="lg">
      {/* Title + location picker + unit toggle */}
      <HStack justify="space-between" mb={4} align="start">
        <VStack align="start" spacing={0} mb={4}>
          <Text color="app.text" fontSize="lg" fontWeight="bold">
            {t('shell.weather.title')}
          </Text>
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
                size="xs"
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
                {!searching &&
                  query.trim().length >= 2 &&
                  results.length === 0 && (
                    <Text fontSize="xs" color={secondaryText} px={1} py={1}>
                      {t('shell.weather.noResults')}
                    </Text>
                  )}
                <VStack
                  align="stretch"
                  spacing={0}
                  maxH="190px"
                  overflowY="auto"
                >
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
        </VStack>
        <HStack spacing={2}>
          <Text
            fontSize="sm"
            color={!useImperial ? primaryText : secondaryText}
            fontWeight={!useImperial ? 'bold' : 'normal'}
          >
            °C
          </Text>
          <Switch
            id="unit-toggle"
            isChecked={useImperial}
            onChange={handleUnitToggle}
            colorScheme="brand"
          />
          <Text
            fontSize="sm"
            color={useImperial ? primaryText : secondaryText}
            fontWeight={useImperial ? 'bold' : 'normal'}
          >
            °F
          </Text>
        </HStack>
      </HStack>

      {/* Current Weather */}
      <VStack spacing={1} mb={4} textAlign="center">
        <HStack spacing={3}>
          {getWeatherIcon(current.weather_code)}
          <Text fontSize="3xl" fontWeight="light" color={primaryText}>
            {useImperial
              ? Math.round(toFahrenheit(current.temperature_2m))
              : Math.round(current.temperature_2m)}
            °{useImperial ? 'F' : 'C'}
          </Text>
        </HStack>
        <Text fontSize="xs" color={secondaryText}>
          {t('shell.weather.feelsLike')}{' '}
          {useImperial
            ? Math.round(toFahrenheit(current.apparent_temperature))
            : Math.round(current.apparent_temperature)}
          °{useImperial ? 'F' : 'C'}
        </Text>
      </VStack>

      {/* Stats */}
      <Grid templateColumns="repeat(4, 1fr)" gap={4} mb={4}>
        <Box
          _hover={{ cursor: 'pointer', borderColor: hoverColor }}
          borderWidth="1px"
          borderRadius="xl"
          boxShadow="md"
          bg={bgColor}
          p={4}
          textAlign="center"
        >
          <Icon as={Wind} boxSize="24px" color="primary.500" mb={1} />
          <Text fontSize="xs" color={primaryText}>
            {useImperial
              ? Math.round(toMilesPerHour(current.wind_speed_10m))
              : Math.round(current.wind_speed_10m)}{' '}
            {useImperial ? 'mph' : 'km/h'}
          </Text>
        </Box>
        <Box
          _hover={{ cursor: 'pointer', borderColor: hoverColor }}
          bg={bgColor}
          p={4}
          textAlign="center"
          boxShadow="md"
          borderWidth="1px"
          borderRadius="xl"
        >
          <Icon as={Droplets} boxSize="24px" color="primary.400" mb={1} />
          <Text fontSize="xs" color={primaryText}>
            {current.relative_humidity_2m}%
          </Text>
        </Box>
        <Box
          _hover={{ cursor: 'pointer', borderColor: hoverColor }}
          bg={bgColor}
          p={4}
          textAlign="center"
          boxShadow="md"
          borderWidth="1px"
          borderRadius="xl"
        >
          <Icon as={Sunrise} boxSize="24px" color="yellow.500" mb={1} />
          <Text fontSize="xs" color={primaryText}>
            {formatTime(daily.sunrise[0])}
          </Text>
        </Box>
        <Box
          _hover={{ cursor: 'pointer', borderColor: hoverColor }}
          bg={bgColor}
          p={4}
          textAlign="center"
          boxShadow="md"
          borderWidth="1px"
          borderRadius="xl"
        >
          <Icon as={Sunset} boxSize="24px" color="orange.500" mb={1} />
          <Text fontSize="xs" color={primaryText}>
            {formatTime(daily.sunset[0])}
          </Text>
        </Box>
      </Grid>

      {/* Forecast */}
      <SimpleGrid columns={{ base: 4, sm: 7 }} spacing={2}>
        {daily.time.slice(0, 7).map((date, index) => (
          <Box
            _hover={{ cursor: 'pointer', borderColor: hoverColor }}
            key={date}
            bg={bgColor}
            p={2}
            textAlign="center"
            boxShadow="md"
            borderWidth="1px"
            borderRadius="xl"
            mb={1}
          >
            <Text
              fontSize="xs"
              color={secondaryText}
              mb={1}
              noOfLines={1}
              textTransform="capitalize"
            >
              {index === 0 ? t('shell.weather.today') : formatDate(date)}
            </Text>
            <Flex justify="center" mb={1}>
              {getWeatherIcon(daily.weather_code[index])}
            </Flex>
            <Text fontSize="xs" color={primaryText} fontWeight="bold">
              {useImperial
                ? Math.round(toFahrenheit(daily.temperature_2m_max[index]))
                : Math.round(daily.temperature_2m_max[index])}
              °{useImperial ? 'F' : 'C'}
            </Text>
            <Text fontSize="xs" color={secondaryText}>
              {useImperial
                ? Math.round(toFahrenheit(daily.temperature_2m_min[index]))
                : Math.round(daily.temperature_2m_min[index])}
              °{useImperial ? 'F' : 'C'}
            </Text>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
};

export default WeatherDashboard;
