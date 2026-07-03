'use client';

/**
 * Farmer weather center: everything the dashboard card has no room for.
 * Opened by clicking the Météo card — current agro-metrics (UV, precipitation,
 * wind + gusts, dew point, pressure, ET0, soil temperature/moisture), a 24 h
 * strip, and a 7-day agronomic table. Data comes from the same open-meteo
 * response the card fetches (extended variable set).
 */

import React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Badge,
  Box,
  Grid,
  HStack,
  Icon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react';
import {
  Cloud,
  CloudRain,
  Droplet,
  Droplets,
  Gauge,
  Leaf,
  Sprout,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  Umbrella,
  Wind,
} from 'lucide-react';

export interface WeatherData {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
    pressure_msl: number;
    cloud_cover: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    precipitation: number[];
    uv_index: number[];
    wind_speed_10m: number[];
    wind_gusts_10m: number[];
    relative_humidity_2m: number[];
    dew_point_2m: number[];
    soil_temperature_6cm: number[];
    soil_moisture_3_to_9cm: number[];
    et0_fao_evapotranspiration: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise: string[];
    sunset: string[];
    uv_index_max: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
    wind_gusts_10m_max: number[];
    wind_direction_10m_dominant: number[];
    et0_fao_evapotranspiration: number[];
    sunshine_duration: number[];
  };
}

/** Extended open-meteo variable set the card requests (single source). */
export const OPEN_METEO_PARAMS =
  'current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,cloud_cover' +
  '&hourly=temperature_2m,precipitation_probability,precipitation,uv_index,wind_speed_10m,wind_gusts_10m,relative_humidity_2m,dew_point_2m,soil_temperature_6cm,soil_moisture_3_to_9cm,et0_fao_evapotranspiration' +
  '&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,et0_fao_evapotranspiration,sunshine_duration' +
  '&timezone=auto&temperature_unit=celsius';

const localeTag = (locale: string): string =>
  locale === 'ar' ? 'ar' : locale === 'en' ? 'en-GB' : 'fr-FR';

/** UV risk bucket → i18n key + badge color. WHO scale. */
export const uvRisk = (
  uv: number
): {
  key: 'low' | 'moderate' | 'high' | 'veryHigh' | 'extreme';
  color: string;
} => {
  if (uv < 3) return { key: 'low', color: 'green' };
  if (uv < 6) return { key: 'moderate', color: 'yellow' };
  if (uv < 8) return { key: 'high', color: 'orange' };
  if (uv < 11) return { key: 'veryHigh', color: 'red' };
  return { key: 'extreme', color: 'purple' };
};

const COMPASS = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
];
const compass = (deg: number) => COMPASS[Math.round(deg / 22.5) % 16];

const toF = (c: number) => (c * 9) / 5 + 32;
const toMph = (kmh: number) => kmh * 0.621371;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  data: WeatherData;
  cityName: string | null;
  useImperial: boolean;
};

const WeatherDetailsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  data,
  cityName,
  useImperial,
}) => {
  const t = useTranslations();
  const locale = useLocale();
  const secondaryText = useColorModeValue('gray.600', 'gray.400');
  const primaryText = useColorModeValue('gray.900', 'white');
  const tileBg = useColorModeValue('gray.50', 'whiteAlpha.100');

  const { current, hourly, daily } = data;

  const temp = (c: number) =>
    `${Math.round(useImperial ? toF(c) : c)}°${useImperial ? 'F' : 'C'}`;
  const speed = (kmh: number) =>
    `${Math.round(useImperial ? toMph(kmh) : kmh)} ${useImperial ? 'mph' : 'km/h'}`;
  const hourLabel = (iso: string) =>
    new Date(iso).toLocaleTimeString(localeTag(locale), {
      hour: '2-digit',
      minute: '2-digit',
    });
  const dayLabel = (iso: string) =>
    new Date(iso).toLocaleDateString(localeTag(locale), {
      weekday: 'short',
      day: 'numeric',
    });

  // Index of the current hour in the hourly arrays.
  const nowIdx = Math.max(
    0,
    hourly.time.findIndex((tISO) => new Date(tISO) >= new Date(current.time))
  );
  const uvNow = hourly.uv_index[nowIdx] ?? 0;
  const uv = uvRisk(uvNow);
  const next24 = hourly.time
    .map((_, i) => i)
    .filter((i) => i >= nowIdx && i < nowIdx + 24);

  const dTs = (label: string) => t(`shell.weather.details.${label}`);

  const stat = (
    icon: React.ElementType,
    color: string,
    label: string,
    value: React.ReactNode
  ) => (
    <Box bg={tileBg} borderRadius="lg" p={3} textAlign="center">
      <Icon as={icon} boxSize="18px" color={color} mb={1} />
      <Text fontSize="2xs" color={secondaryText} noOfLines={1}>
        {label}
      </Text>
      <Text fontSize="sm" fontWeight="semibold" color={primaryText}>
        {value}
      </Text>
    </Box>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent mx={{ base: 2, md: 8 }}>
        <ModalHeader pb={1}>
          {dTs('title')}
          {cityName ? ` — ${cityName}` : ''}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          {/* ── Now: the farmer metrics ─────────────────────────────── */}
          <Text fontSize="sm" fontWeight="bold" color={secondaryText} mb={2}>
            {dTs('now')}
          </Text>
          <SimpleGrid columns={{ base: 2, sm: 3, md: 5 }} spacing={2} mb={5}>
            {stat(
              Sun,
              `${uv.color}.500`,
              dTs('uvIndex'),
              <>
                {uvNow.toFixed(1)}{' '}
                <Badge colorScheme={uv.color} fontSize="2xs">
                  {dTs(`uv.${uv.key}`)}
                </Badge>
              </>
            )}
            {stat(
              Umbrella,
              'blue.400',
              dTs('precipProb'),
              `${hourly.precipitation_probability[nowIdx] ?? 0}%`
            )}
            {stat(
              Wind,
              'primary.500',
              dTs('windGusts'),
              `${speed(current.wind_speed_10m)} / ${speed(current.wind_gusts_10m)} ${compass(current.wind_direction_10m)}`
            )}
            {stat(
              Droplet,
              'cyan.500',
              dTs('dewPoint'),
              temp(hourly.dew_point_2m[nowIdx] ?? 0)
            )}
            {stat(
              Gauge,
              'gray.500',
              dTs('pressure'),
              `${Math.round(current.pressure_msl)} hPa`
            )}
            {stat(
              Cloud,
              'gray.400',
              dTs('cloudCover'),
              `${current.cloud_cover}%`
            )}
            {stat(
              Leaf,
              'green.500',
              dTs('et0Today'),
              `${(daily.et0_fao_evapotranspiration[0] ?? 0).toFixed(1)} mm`
            )}
            {stat(
              Thermometer,
              'orange.400',
              dTs('soilTemp'),
              temp(hourly.soil_temperature_6cm[nowIdx] ?? 0)
            )}
            {stat(
              Sprout,
              'green.400',
              dTs('soilMoisture'),
              `${Math.round((hourly.soil_moisture_3_to_9cm[nowIdx] ?? 0) * 100)}%`
            )}
            {stat(
              Droplets,
              'blue.500',
              dTs('humidity'),
              `${current.relative_humidity_2m}%`
            )}
          </SimpleGrid>

          {/* ── Next 24 h ──────────────────────────────────────────── */}
          <Text fontSize="sm" fontWeight="bold" color={secondaryText} mb={2}>
            {dTs('next24h')}
          </Text>
          <Box overflowX="auto" mb={5} pb={1}>
            <HStack spacing={2} minW="max-content">
              {next24.map((i) => (
                <VStack
                  key={hourly.time[i]}
                  bg={tileBg}
                  borderRadius="lg"
                  px={2}
                  py={2}
                  spacing={0.5}
                  minW="64px"
                >
                  <Text fontSize="2xs" color={secondaryText}>
                    {hourLabel(hourly.time[i])}
                  </Text>
                  <Text fontSize="sm" fontWeight="semibold" color={primaryText}>
                    {temp(hourly.temperature_2m[i])}
                  </Text>
                  <HStack spacing={0.5}>
                    <Icon as={Umbrella} boxSize="10px" color="blue.400" />
                    <Text fontSize="2xs" color="blue.400">
                      {hourly.precipitation_probability[i] ?? 0}%
                    </Text>
                  </HStack>
                  <HStack spacing={0.5}>
                    <Icon as={Sun} boxSize="10px" color="yellow.500" />
                    <Text fontSize="2xs" color={secondaryText}>
                      {(hourly.uv_index[i] ?? 0).toFixed(0)}
                    </Text>
                  </HStack>
                  <HStack spacing={0.5}>
                    <Icon as={Wind} boxSize="10px" color="primary.500" />
                    <Text fontSize="2xs" color={secondaryText}>
                      {Math.round(
                        useImperial
                          ? toMph(hourly.wind_speed_10m[i])
                          : hourly.wind_speed_10m[i]
                      )}
                    </Text>
                  </HStack>
                </VStack>
              ))}
            </HStack>
          </Box>

          {/* ── 7-day agronomic table ──────────────────────────────── */}
          <Text fontSize="sm" fontWeight="bold" color={secondaryText} mb={2}>
            {dTs('week')}
          </Text>
          <TableContainer>
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th px={2}>{dTs('day')}</Th>
                  <Th px={2}>{dTs('minMax')}</Th>
                  <Th px={2}>
                    <HStack spacing={1}>
                      <Icon as={Umbrella} boxSize="12px" />
                      <Text>{dTs('rain')}</Text>
                    </HStack>
                  </Th>
                  <Th px={2}>UV</Th>
                  <Th px={2}>
                    <HStack spacing={1}>
                      <Icon as={Wind} boxSize="12px" />
                      <Text>{dTs('gusts')}</Text>
                    </HStack>
                  </Th>
                  <Th px={2}>ET₀</Th>
                  <Th px={2}>
                    <HStack spacing={1}>
                      <Icon as={Sunrise} boxSize="12px" />
                      <Icon as={Sunset} boxSize="12px" />
                    </HStack>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {daily.time.slice(0, 7).map((date, i) => {
                  const dUv = uvRisk(daily.uv_index_max[i] ?? 0);
                  return (
                    <Tr key={date}>
                      <Td px={2} fontSize="xs">
                        {dayLabel(date)}
                      </Td>
                      <Td px={2} fontSize="xs" whiteSpace="nowrap">
                        {temp(daily.temperature_2m_min[i])} /{' '}
                        <b>{temp(daily.temperature_2m_max[i])}</b>
                      </Td>
                      <Td px={2} fontSize="xs" whiteSpace="nowrap">
                        {daily.precipitation_probability_max[i] ?? 0}% ·{' '}
                        {(daily.precipitation_sum[i] ?? 0).toFixed(1)} mm
                      </Td>
                      <Td px={2} fontSize="xs">
                        <Badge colorScheme={dUv.color} fontSize="2xs">
                          {(daily.uv_index_max[i] ?? 0).toFixed(0)}
                        </Badge>
                      </Td>
                      <Td px={2} fontSize="xs" whiteSpace="nowrap">
                        {speed(daily.wind_gusts_10m_max[i] ?? 0)}{' '}
                        {compass(daily.wind_direction_10m_dominant[i] ?? 0)}
                      </Td>
                      <Td px={2} fontSize="xs" whiteSpace="nowrap">
                        {(daily.et0_fao_evapotranspiration[i] ?? 0).toFixed(1)}{' '}
                        mm
                      </Td>
                      <Td px={2} fontSize="xs" whiteSpace="nowrap">
                        {new Date(daily.sunrise[i]).toLocaleTimeString(
                          localeTag(locale),
                          { hour: '2-digit', minute: '2-digit' }
                        )}{' '}
                        /{' '}
                        {new Date(daily.sunset[i]).toLocaleTimeString(
                          localeTag(locale),
                          { hour: '2-digit', minute: '2-digit' }
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </TableContainer>

          <HStack mt={3} spacing={1}>
            <Icon as={CloudRain} boxSize="10px" color={secondaryText} />
            <Text fontSize="2xs" color={secondaryText}>
              {dTs('source')}
            </Text>
          </HStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default WeatherDetailsModal;
