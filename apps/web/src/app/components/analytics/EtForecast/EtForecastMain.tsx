'use client';

import {
  Box,
  Flex,
  HStack,
  Spinner,
  Text,
  VStack,
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

  const max = maxEtMm(days);
  const peak = peakEtDay(days);
  const weekdayFmt = new Intl.DateTimeFormat(LOCALE_TAG[locale] ?? 'en-GB', {
    weekday: 'short',
    day: 'numeric',
  });

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
      <HStack align="flex-end" spacing={{ base: 1.5, md: 3 }} overflowX="auto">
        {days.map((d) => {
          const heightPct = Math.max(6, Math.round((d.et0_mm / max) * 100));
          return (
            <VStack key={d.date} spacing={1} minW="44px" flex="1">
              <Text fontSize="xs" color="gray.500" aria-hidden>
                {d.et0_mm.toFixed(1)}
              </Text>
              <Box
                w="full"
                bg={cardBg}
                borderRadius="md"
                h="96px"
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
              <Text fontSize="xs" textAlign="center" noOfLines={1}>
                {weekdayFmt.format(new Date(d.date))}
              </Text>
            </VStack>
          );
        })}
      </HStack>
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
