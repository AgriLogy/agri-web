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
  Button,
} from '@chakra-ui/react';
import {
  Cloud,
  Sun,
  CloudOff,
  CloudRain,
  Wind,
  Droplets,
  Sunrise,
  Sunset,
} from 'lucide-react';
import {
  readWeatherLocation,
  type WeatherLocation,
} from '@agri/api-client/weatherLocationStorage';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import WeatherDetailsModal, {
  OPEN_METEO_PARAMS,
} from '@/app/components/dashboard/WeatherDetailsModal';
import {
  nextWeatherData,
  parseOpenMeteoResponse,
  roundOrDash,
  timeOrDash,
  type Num,
  type WeatherData,
} from '@/app/utils/openMeteoResponse';
import WeatherLocationPicker from '@/app/components/weather/WeatherLocationPicker';
import { reverseGeocodeCity } from '@/app/utils/reverseGeocode';
import Loading from '../common/Loading';

const localeTag = (locale: string): string =>
  locale === 'ar' ? 'ar' : locale === 'en' ? 'en-GB' : 'fr-FR';

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
  const [detailsOpen, setDetailsOpen] = useState(false);

  const bgColor = useColorModeValue('white', 'gray.800');
  const primaryText = useColorModeValue('gray.900', 'white');
  const secondaryText = useColorModeValue('gray.600', 'gray.400');
  const tableBg = useColorModeValue('white', 'gray.800');
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
          `https://api.open-meteo.com/v1/forecast/?latitude=${location.lat}&longitude=${location.lon}&${OPEN_METEO_PARAMS}`
        );
        // An error answer (rate limit, outage) has no `current` / `daily`:
        // validate before storing, and keep the last good forecast if any.
        const body: unknown = await response.json().catch(() => null);
        const parsed = parseOpenMeteoResponse(response.ok, body);
        if (!parsed) console.warn('Open-Meteo: unusable response', body);
        if (!cancelled) setWeatherData((prev) => nextWeatherData(prev, parsed));
      } catch (error) {
        console.error('Open-Meteo fetch failed:', error);
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
    reverseGeocodeCity(location.lat, location.lon, locale).then((city) => {
      if (!cancelled) setCityName(city);
    });
    return () => {
      cancelled = true;
    };
  }, [location.lat, location.lon, location.label, locale]);

  const toFahrenheit = (celsius: number) => (celsius * 9) / 5 + 32;
  const toMilesPerHour = (kmph: number) => kmph * 0.621371;
  const tempLabel = (c: Num) =>
    `${roundOrDash(c, useImperial ? toFahrenheit : undefined)}°${useImperial ? 'F' : 'C'}`;

  const handleUnitToggle = () => {
    setUseImperial((prevState) => !prevState);
  };

  const getWeatherIcon = (code: Num) => {
    if (code == null) return <Icon as={Cloud} color="gray.400" />;
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

  const formatTime = (time: string | undefined) =>
    timeOrDash(time, localeTag(locale), {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

  const formatDate = (date: string) => {
    const d = new Date(date);
    return Number.isNaN(d.getTime())
      ? '—'
      : d.toLocaleDateString(localeTag(locale), { weekday: 'short' });
  };

  if (loading) {
    return <Loading />;
  }

  // No usable forecast yet (Open-Meteo error / outage on the first load):
  // a compact placeholder instead of crashing the whole dashboard.
  if (!weatherData) {
    return (
      <Box
        bg={tableBg}
        p={p}
        width="100%"
        borderRadius="md"
        boxShadow="lg"
        role="status"
      >
        <HStack justify="space-between" align="start" mb={2}>
          <VStack align="start" spacing={0}>
            <Text color="app.text" fontSize="lg" fontWeight="bold">
              {t('shell.weather.title')}
            </Text>
            <WeatherLocationPicker size="xs" onChange={setLocation} />
          </VStack>
        </HStack>
        <HStack spacing={2} color={secondaryText} py={2}>
          <Icon as={CloudOff} boxSize="18px" />
          <Text fontSize="sm">{t('shell.weather.unavailable')}</Text>
        </HStack>
      </Box>
    );
  }

  const { current, daily } = weatherData;

  return (
    <Box bg={tableBg} p={p} width="100%" borderRadius="md" boxShadow="lg">
      {/* Title + location picker + unit toggle */}
      <HStack justify="space-between" mb={4} align="start">
        <VStack align="start" spacing={0} mb={4}>
          <Text color="app.text" fontSize="lg" fontWeight="bold">
            {t('shell.weather.title')}
          </Text>
          <WeatherLocationPicker size="xs" onChange={setLocation} />
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
          <Button
            size="xs"
            variant="ghost"
            color={secondaryText}
            onClick={() => setDetailsOpen(true)}
            _hover={{ color: primaryText }}
          >
            {t('shell.weather.details.open')}
          </Button>
        </HStack>
      </HStack>

      {/* Current Weather — click for the full farmer view */}
      <VStack
        spacing={1}
        mb={4}
        textAlign="center"
        cursor="pointer"
        role="button"
        aria-label={t('shell.weather.details.open')}
        onClick={() => setDetailsOpen(true)}
        _hover={{ opacity: 0.85 }}
      >
        <HStack spacing={3}>
          {getWeatherIcon(current.weather_code)}
          <Text fontSize="3xl" fontWeight="light" color={primaryText}>
            {tempLabel(current.temperature_2m)}
          </Text>
        </HStack>
        <Text fontSize="xs" color={secondaryText}>
          {t('shell.weather.feelsLike')}{' '}
          {/* Keep "16°C" in reading order inside Arabic text. */}
          <bdi dir="ltr">{tempLabel(current.apparent_temperature)}</bdi>
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
            <bdi dir="ltr">
              {roundOrDash(
                current.wind_speed_10m,
                useImperial ? toMilesPerHour : undefined
              )}{' '}
              {useImperial ? 'mph' : 'km/h'}
            </bdi>
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
            {roundOrDash(current.relative_humidity_2m)}%
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
            key={`${date}-${index}`}
            onClick={() => setDetailsOpen(true)}
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
              {getWeatherIcon(daily.weather_code[index] ?? null)}
            </Flex>
            <Text fontSize="xs" color={primaryText} fontWeight="bold">
              {tempLabel(daily.temperature_2m_max[index] ?? null)}
            </Text>
            <Text fontSize="xs" color={secondaryText}>
              {tempLabel(daily.temperature_2m_min[index] ?? null)}
            </Text>
          </Box>
        ))}
      </SimpleGrid>
      <WeatherDetailsModal
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        data={weatherData}
        cityName={cityName}
        useImperial={useImperial}
      />
    </Box>
  );
};

export default WeatherDashboard;
