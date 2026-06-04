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
} from '@chakra-ui/react';
import {
  Cloud,
  Sun,
  CloudRain,
  Wind,
  Droplets,
  Sunrise,
  Sunset,
} from 'lucide-react';
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

const localeTag = (locale: string): string =>
  locale === 'ar' ? 'ar' : locale === 'en' ? 'en-GB' : 'fr-FR';

const WeatherDashboard = () => {
  const t = useTranslations();
  const locale = useLocale();
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [useImperial, setUseImperial] = useState(false);
  const bgColor = useColorModeValue('white', 'gray.800');
  const primaryText = useColorModeValue('gray.900', 'white');
  const secondaryText = useColorModeValue('gray.600', 'gray.400');
  const tableBg = useColorModeValue('white', 'gray.800');
  const p = useBreakpointValue({ base: 2, md: 4 });
  const { hoverColor } = useColorModeStyles();

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch(
          'https://api.open-meteo.com/v1/forecast/?latitude=32.906323&longitude=-6.934420&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto&temperature_unit=celsius'
        );
        const data = await response.json();
        setWeatherData(data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchWeather();
  }, []);

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
      {/* Unit Toggle */}
      <HStack justify="space-between" mb={4}>
        <Text color="app.text" fontSize="lg" fontWeight="bold" mb={4}>
          {t('shell.weather.title')}
        </Text>
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
