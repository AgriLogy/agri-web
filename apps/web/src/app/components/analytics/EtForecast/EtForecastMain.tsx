'use client';

import {
  Badge,
  Box,
  Flex,
  HStack,
  Spinner,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { WiDaySunny } from 'react-icons/wi';

import {
  getEtForecast,
  readWeatherLocation,
  WEATHER_LOCATION_UPDATED_EVENT,
  type EtForecastDay,
} from '@agri/api-client';
import { maxEtMm, peakEtDay, totalEtMm } from '@/app/lib/etForecast';
import WeatherLocationPicker from '@/app/components/weather/WeatherLocationPicker';

const LOCALE_TAG: Record<string, string> = {
  fr: 'fr-FR',
  ar: 'ar-MA',
  en: 'en-GB',
};

// Human-friendly names for the real forecast providers; "mock" is translated
// to a "demo model" label so the strip never presents synthetic values as a
// live weather feed.
const PROVIDER_LABEL: Record<string, string> = {
  openweather: 'OpenWeather',
  'open-meteo': 'Open-Meteo',
};

const EtForecastMain = ({
  filters,
}: {
  filters: { selectedZone: number | null };
}) => {
  const t = useTranslations();
  const locale = useLocale();
  const { selectedZone } = filters;

  const [days, setDays] = useState<EtForecastDay[]>([]);
  const [provider, setProvider] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Bumped whenever the picked weather location changes so the forecast
  // re-fetches against the new coordinates.
  const [locationVersion, setLocationVersion] = useState(0);

  const barColor = useColorModeValue('teal.400', 'teal.300');
  const peakBarColor = useColorModeValue('orange.400', 'orange.300');
  const trackBg = useColorModeValue('gray.100', 'whiteAlpha.100');
  const peakRowBg = useColorModeValue('orange.50', 'whiteAlpha.50');
  // Raw CSS colour (not a Chakra token) — the reference tick is a native
  // absolutely-positioned marker over the bar track.
  const refTick = useColorModeValue('#DD6B20', '#F6AD55'); // orange.500 / .300

  // Re-fetch when the shared weather location changes (from this card's picker
  // or any other consumer, e.g. the weather dashboard).
  useEffect(() => {
    const bump = () => setLocationVersion((v) => v + 1);
    window.addEventListener(WEATHER_LOCATION_UPDATED_EVENT, bump);
    return () =>
      window.removeEventListener(WEATHER_LOCATION_UPDATED_EVENT, bump);
  }, []);

  useEffect(() => {
    if (selectedZone == null) {
      setDays([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(false);
    // Anchor Open-Meteo to the farmer's picked weather location (client-side);
    // the backend falls back to account/zone coordinates when it's unset.
    const loc = readWeatherLocation();
    getEtForecast(
      selectedZone,
      7,
      loc ? { lat: loc.lat, lon: loc.lon } : undefined
    )
      .then((res) => {
        if (active) {
          setDays(res.days);
          setProvider(res.provider);
        }
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedZone, locationVersion]);

  const title = t('station.etForecast.title');

  // Centered header icon harmonizing this card with the sibling "last data"
  // cards (evapotranspiration = sun driving water loss).
  const headerIcon = (
    <Box display="flex" justifyContent="center" mb={2}>
      <WiDaySunny size={44} color="#DD6B20" />
    </Box>
  );

  // Title + inline location picker — kept visible in every state so the farmer
  // can re-anchor the forecast even while it's loading, empty, or errored.
  const titleRow = (
    <Box mb={2}>
      {headerIcon}
      <Text fontWeight="bold">{title}</Text>
      <WeatherLocationPicker size="xs" />
    </Box>
  );

  if (loading) {
    return (
      <Box>
        {titleRow}
        <Spinner size="sm" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        {titleRow}
        <Text color="red.400" fontSize="sm">
          {t('station.etForecast.error')}
        </Text>
      </Box>
    );
  }

  if (days.length === 0) {
    return (
      <Box>
        {titleRow}
        <Text fontSize="sm" color="gray.500">
          {t('station.etForecast.empty')}
        </Text>
      </Box>
    );
  }

  const peak = peakEtDay(days);
  const localeTag = LOCALE_TAG[locale] ?? 'en-GB';
  const weekdayFmt = new Intl.DateTimeFormat(localeTag, { weekday: 'short' });
  const dateFmt = new Intl.DateTimeFormat(localeTag, {
    day: 'numeric',
    month: 'short',
  });

  // Bars and the Open-Meteo reference tick share ONE horizontal axis
  // (`chartMax`) so a day's computed ET₀ and its published FAO-56 reference are
  // directly comparable within the same row.
  const openMeteo = days.map((d) =>
    typeof d.et0_openmeteo_mm === 'number' ? d.et0_openmeteo_mm : null
  );
  const hasReference = openMeteo.some((v) => v != null);
  const chartMax =
    Math.max(maxEtMm(days), ...openMeteo.map((v) => v ?? 0)) || 1;

  return (
    <Box>
      {headerIcon}
      <Flex justify="space-between" align="start" mb={3} wrap="wrap" gap={2}>
        <Box>
          <Text fontWeight="bold">{title}</Text>
          <WeatherLocationPicker size="xs" />
        </Box>
        <Text fontSize="sm" color="gray.500">
          {t('station.etForecast.summary', {
            total: totalEtMm(days),
            peak: peak ? dateFmt.format(new Date(peak.date)) : '—',
          })}
        </Text>
      </Flex>

      {hasReference && (
        <HStack spacing={4} mb={3} fontSize="xs" color="gray.500" wrap="wrap">
          <HStack spacing={1.5}>
            <Box w="10px" h="10px" bg={barColor} borderRadius="sm" />
            <Text>{t('station.etForecast.legendComputed')}</Text>
          </HStack>
          <HStack spacing={1.5}>
            <Box w="2px" h="12px" bg={refTick} borderRadius="full" />
            <Text>{t('station.etForecast.legendOpenMeteo')}</Text>
          </HStack>
        </HStack>
      )}

      {/* One row per forecast day — a horizontal bar list (design #18):
          weekday · date · ET₀ bar · value, with the Open-Meteo reference as a
          tick over the same track. */}
      <Box>
        {days.map((d, i) => {
          const isPeak = peak != null && d.date === peak.date;
          const widthPct = Math.max(4, Math.round((d.et0_mm / chartMax) * 100));
          const ref = openMeteo[i];
          const refPct =
            ref != null
              ? Math.min(100, Math.max(0, (ref / chartMax) * 100))
              : null;
          const when = new Date(d.date);
          return (
            <Flex
              key={d.date}
              align="center"
              gap={{ base: 2, md: 3 }}
              py={2}
              px={{ base: 1, md: 2 }}
              borderRadius="md"
              bg={isPeak ? peakRowBg : undefined}
            >
              {/* day label */}
              <Box minW={{ base: '58px', md: '72px' }}>
                <Text fontSize="sm" fontWeight="semibold" lineHeight="short">
                  {weekdayFmt.format(when)}
                </Text>
                <Text fontSize="xs" color="gray.500" lineHeight="short">
                  {dateFmt.format(when)}
                </Text>
              </Box>

              {/* peak badge */}
              <Box minW={{ base: '0', md: '44px' }}>
                {isPeak && (
                  <Badge
                    colorScheme="orange"
                    fontSize="0.6rem"
                    textTransform="none"
                  >
                    {t('station.etForecast.peakBadge')}
                  </Badge>
                )}
              </Box>

              {/* bar track */}
              <Box
                flex="1"
                minW={0}
                position="relative"
                h="16px"
                bg={trackBg}
                borderRadius="full"
                title={`${d.date}: ${d.et0_mm} mm`}
              >
                <Box
                  position="absolute"
                  insetStart={0}
                  top={0}
                  bottom={0}
                  w={`${widthPct}%`}
                  bg={isPeak ? peakBarColor : barColor}
                  borderRadius="full"
                />
                {refPct != null && (
                  <Box
                    position="absolute"
                    top="-2px"
                    bottom="-2px"
                    insetStart={`${refPct}%`}
                    w="2px"
                    bg={refTick}
                    borderRadius="full"
                    title={`Open-Meteo: ${ref} mm`}
                  />
                )}
              </Box>

              {/* value */}
              <Box minW={{ base: '56px', md: '68px' }} textAlign="end">
                <Text fontSize="sm" fontWeight="bold" lineHeight="short">
                  {d.et0_mm.toFixed(1)}
                  <Text as="span" fontSize="xs" color="gray.500" ms={0.5}>
                    mm
                  </Text>
                </Text>
                {refPct != null && ref != null && (
                  <Text fontSize="0.65rem" color="gray.500" lineHeight="short">
                    {t('station.etForecast.referenceShort', {
                      value: ref.toFixed(1),
                    })}
                  </Text>
                )}
              </Box>
            </Flex>
          );
        })}
      </Box>

      <Text fontSize="xs" color="gray.400" mt={3}>
        {t('station.etForecast.unit')}
      </Text>
      {provider && (
        <Text fontSize="xs" color="gray.400" mt={0.5}>
          {t('station.etForecast.source', {
            provider:
              provider === 'mock'
                ? t('station.etForecast.providerMock')
                : (PROVIDER_LABEL[provider] ?? provider),
          })}
        </Text>
      )}
    </Box>
  );
};

export default EtForecastMain;
