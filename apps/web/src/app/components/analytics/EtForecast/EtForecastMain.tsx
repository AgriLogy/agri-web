'use client';

import {
  Box,
  Flex,
  HStack,
  Spinner,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { getEtForecast, type EtForecastDay } from '@agri/api-client';
import { maxEtMm, peakEtDay, totalEtMm } from '@/app/lib/etForecast';

const LOCALE_TAG: Record<string, string> = {
  fr: 'fr-FR',
  ar: 'ar-MA',
  en: 'en-GB',
};

// Human-friendly names for the real forecast providers; "mock" is translated
// to a "demo model" label so the graph never presents synthetic values as a
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

  const barColor = useColorModeValue('teal.400', 'teal.300');
  const cardBg = useColorModeValue('gray.50', 'whiteAlpha.100');
  // Raw CSS colours (not Chakra tokens) — the curve is a native <svg> stroke.
  const curveStroke = useColorModeValue('#DD6B20', '#F6AD55'); // orange.500 / .300

  useEffect(() => {
    if (selectedZone == null) {
      setDays([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(false);
    getEtForecast(selectedZone, 7)
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
  }, [selectedZone]);

  const title = t('station.etForecast.title');

  if (loading) {
    return (
      <Box>
        <Text fontWeight="bold" mb={2}>
          {title}
        </Text>
        <Spinner size="sm" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Text fontWeight="bold" mb={2}>
          {title}
        </Text>
        <Text color="red.400" fontSize="sm">
          {t('station.etForecast.error')}
        </Text>
      </Box>
    );
  }

  if (days.length === 0) {
    return (
      <Box>
        <Text fontWeight="bold" mb={2}>
          {title}
        </Text>
        <Text fontSize="sm" color="gray.500">
          {t('station.etForecast.empty')}
        </Text>
      </Box>
    );
  }

  const peak = peakEtDay(days);
  const weekdayFmt = new Intl.DateTimeFormat(LOCALE_TAG[locale] ?? 'en-GB', {
    weekday: 'short',
    day: 'numeric',
  });

  // The real Open-Meteo reference ET₀ per day (null when unavailable). Bars and
  // curve share ONE vertical axis (`chartMax`) so they're directly comparable —
  // Open-Meteo values often exceed the placeholder bars, so we scale to both.
  const openMeteo = days.map((d) =>
    typeof d.et0_openmeteo_mm === 'number' ? d.et0_openmeteo_mm : null
  );
  const hasCurve = openMeteo.some((v) => v != null);
  const chartMax =
    Math.max(maxEtMm(days), ...openMeteo.map((v) => v ?? 0)) || 1;

  const n = days.length;
  const curvePoints = days
    .map((d, i) => {
      const v = openMeteo[i];
      if (v == null) return null;
      const x = ((i + 0.5) / n) * 100;
      const y = (1 - v / chartMax) * 100;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .filter((p): p is string => p !== null)
    .join(' ');

  const rowSpacing = { base: 1.5, md: 3 };
  const cellProps = { flex: '1', minW: '44px' } as const;

  return (
    <Box>
      <Flex justify="space-between" align="baseline" mb={3} wrap="wrap" gap={2}>
        <Text fontWeight="bold">{title}</Text>
        <Text fontSize="sm" color="gray.500">
          {t('station.etForecast.summary', {
            total: totalEtMm(days),
            peak: peak ? weekdayFmt.format(new Date(peak.date)) : '—',
          })}
        </Text>
      </Flex>

      {hasCurve && (
        <HStack spacing={4} mb={2} fontSize="xs" color="gray.500" wrap="wrap">
          <HStack spacing={1.5}>
            <Box w="10px" h="10px" bg={barColor} borderRadius="sm" />
            <Text>{t('station.etForecast.legendComputed')}</Text>
          </HStack>
          <HStack spacing={1.5}>
            <Box w="16px" borderTopWidth="2px" borderColor={curveStroke} />
            <Text>{t('station.etForecast.legendOpenMeteo')}</Text>
          </HStack>
        </HStack>
      )}

      <Box overflowX="auto">
        {/* value row */}
        <HStack align="flex-end" spacing={rowSpacing} minW="308px">
          {days.map((d) => (
            <Text
              key={d.date}
              {...cellProps}
              fontSize="xs"
              color="gray.500"
              textAlign="center"
              aria-hidden
            >
              {d.et0_mm.toFixed(1)}
            </Text>
          ))}
        </HStack>

        {/* bar band + Open-Meteo curve overlay */}
        <Box position="relative" h="96px" minW="308px">
          <HStack align="flex-end" spacing={rowSpacing} h="100%">
            {days.map((d) => {
              const heightPct = Math.max(
                6,
                Math.round((d.et0_mm / chartMax) * 100)
              );
              return (
                <Box
                  key={d.date}
                  {...cellProps}
                  h="100%"
                  bg={cardBg}
                  borderRadius="md"
                  display="flex"
                  alignItems="flex-end"
                  overflow="hidden"
                >
                  <Box
                    w="full"
                    bg={barColor}
                    h={`${heightPct}%`}
                    borderTopRadius="sm"
                    title={`${d.date}: ${d.et0_mm} mm`}
                  />
                </Box>
              );
            })}
          </HStack>
          {hasCurve && (
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                overflow: 'visible',
              }}
              aria-hidden
            >
              <polyline
                points={curvePoints}
                fill="none"
                stroke={curveStroke}
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          )}
        </Box>

        {/* weekday row */}
        <HStack spacing={rowSpacing} mt={1} minW="308px">
          {days.map((d) => (
            <Text
              key={d.date}
              {...cellProps}
              fontSize="xs"
              textAlign="center"
              noOfLines={1}
            >
              {weekdayFmt.format(new Date(d.date))}
            </Text>
          ))}
        </HStack>
      </Box>

      <Text fontSize="xs" color="gray.400" mt={2}>
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
