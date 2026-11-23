'use client';

/**
 * Map overlay for the "Prévisions" layer (agri-api#459 phase 3): horizon
 * (1 / 3 / 7 days) and metric (rain total or rain − ET0) selectors plus the
 * colour legend. The colouring itself is done by the map from
 * `lib/farmMap/forecast.ts`.
 */

import { useTranslations } from 'next-intl';
import {
  Box,
  Flex,
  HStack,
  Select,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';
import {
  FORECAST_HORIZONS,
  FORECAST_METRICS,
  legendEntries,
  NO_DATA_COLOR,
  SCALES,
  toHorizon,
  type ForecastHorizon,
  type ForecastMetric,
} from '@/app/lib/farmMap/forecast';

interface Props {
  horizon: ForecastHorizon;
  metric: ForecastMetric;
  onHorizon: (h: ForecastHorizon) => void;
  onMetric: (m: ForecastMetric) => void;
  state: 'loading' | 'ready' | 'error';
  provider: string | null;
  sectorCount: number;
  bg: string;
  border: string;
}

export default function ForecastLegend({
  horizon,
  metric,
  onHorizon,
  onMetric,
  state,
  provider,
  sectorCount,
  bg,
  border,
}: Props) {
  const t = useTranslations();
  const entries = legendEntries(SCALES[metric]);
  return (
    <Box
      bg={bg}
      borderWidth="1px"
      borderColor={border}
      borderRadius="md"
      boxShadow="md"
      p={2}
      maxW="230px"
      pointerEvents="auto"
      data-testid="forecast-legend"
    >
      <Flex justify="space-between" align="center" mb={1} gap={2}>
        <Text fontSize="xs" fontWeight={700}>
          {t('misc.map.forecast.title')}
        </Text>
        {state === 'loading' ? <Spinner size="xs" /> : null}
      </Flex>
      <HStack spacing={1} mb={2}>
        <Select
          size="xs"
          value={horizon}
          onChange={(e) => onHorizon(toHorizon(e.target.value))}
          aria-label={t('misc.map.forecast.horizon')}
        >
          {FORECAST_HORIZONS.map((h) => (
            <option key={h} value={h}>
              {t('misc.map.forecast.horizonDays', { count: h })}
            </option>
          ))}
        </Select>
        <Select
          size="xs"
          value={metric}
          onChange={(e) => onMetric(e.target.value as ForecastMetric)}
          aria-label={t('misc.map.forecast.metric')}
        >
          {FORECAST_METRICS.map((m) => (
            <option key={m} value={m}>
              {t(`misc.map.forecast.metrics.${m}`)}
            </option>
          ))}
        </Select>
      </HStack>
      {state === 'error' ? (
        <Text fontSize="xs" color="red.500">
          {t('misc.map.forecast.loadError')}
        </Text>
      ) : (
        <>
          <Text fontSize="10px" mb={1}>
            {t(`misc.map.forecast.legendHint.${metric}`)}
          </Text>
          <VStack align="stretch" spacing="2px">
            {[...entries, { color: NO_DATA_COLOR, label: '' }].map((e, i) => (
              <HStack key={`${e.color}-${i}`} spacing={2}>
                <Box
                  w="14px"
                  h="10px"
                  borderRadius="2px"
                  bg={e.color}
                  borderWidth="1px"
                  borderColor="blackAlpha.300"
                  flexShrink={0}
                />
                <Text fontSize="10px" dir={e.label ? 'ltr' : undefined}>
                  {e.label ? `${e.label} mm` : t('misc.map.forecast.noData')}
                </Text>
              </HStack>
            ))}
          </VStack>
          {state === 'ready' && sectorCount === 0 ? (
            <Text fontSize="10px" mt={1}>
              {t('misc.map.forecast.empty')}
            </Text>
          ) : null}
          {provider === 'mock' ? (
            <Text fontSize="10px" mt={1} color="orange.500">
              {t('misc.map.forecast.mock')}
            </Text>
          ) : null}
        </>
      )}
    </Box>
  );
}
