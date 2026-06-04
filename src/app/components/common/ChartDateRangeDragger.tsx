'use client';

import {
  Box,
  Flex,
  RangeSlider,
  RangeSliderFilledTrack,
  RangeSliderThumb,
  RangeSliderTrack,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTranslations } from 'next-intl';

type Props = {
  /** Sorted unique timestamps (same order as slider indices) */
  timestamps: string[];
  startIdx: number;
  endIdx: number;
  onChange: (range: number[]) => void;
  /** Shown above the slider */
  label?: string;
};

function formatTick(ts: string) {
  try {
    return format(parseISO(ts), 'd MMM yyyy', { locale: fr });
  } catch {
    return ts;
  }
}

/**
 * Dual-thumb range control at the bottom of a chart to zoom the visible time window.
 */
export default function ChartDateRangeDragger({
  timestamps,
  startIdx,
  endIdx,
  onChange,
  label,
}: Props) {
  const t = useTranslations();
  const effectiveLabel = label ?? t('misc.chartDateRangeDragger.label');
  const border = useColorModeValue('gray.200', 'gray.600');
  const muted = useColorModeValue('gray.600', 'gray.400');
  const trackBg = useColorModeValue('gray.100', 'gray.700');
  const accent = useColorModeValue('teal.500', 'teal.300');

  const n = timestamps.length;
  const maxIdx = Math.max(0, n - 1);

  if (n === 0) return null;

  const safeStart = Math.min(Math.max(0, startIdx), maxIdx);
  const safeEnd = Math.min(Math.max(0, endIdx), maxIdx);
  const from = timestamps[safeStart];
  const to = timestamps[safeEnd];

  return (
    <Box
      pt={3}
      pb={1}
      px={{ base: 1, md: 2 }}
      mt={1}
      borderTopWidth="1px"
      borderColor={border}
    >
      <Flex
        justify="space-between"
        align={{ base: 'flex-start', sm: 'center' }}
        direction={{ base: 'column', sm: 'row' }}
        gap={2}
        mb={2}
      >
        <Text
          fontSize="xs"
          fontWeight="semibold"
          color={muted}
          letterSpacing="wide"
        >
          {effectiveLabel}
        </Text>
        <Text
          fontSize="sm"
          fontWeight="medium"
          color="gray.700"
          _dark={{ color: 'gray.200' }}
        >
          {from && to ? `${formatTick(from)} → ${formatTick(to)}` : '—'}
        </Text>
      </Flex>

      <RangeSlider
        aria-label={[
          t('misc.chartDateRangeDragger.startAria'),
          t('misc.chartDateRangeDragger.endAria'),
        ]}
        min={0}
        max={maxIdx}
        step={1}
        value={[safeStart, safeEnd]}
        onChange={(v) => onChange([v[0], v[1]])}
        focusThumbOnChange={false}
      >
        <RangeSliderTrack bg={trackBg} h="6px" borderRadius="full">
          <RangeSliderFilledTrack bg={accent} />
        </RangeSliderTrack>
        <RangeSliderThumb
          index={0}
          boxSize={4}
          borderWidth={2}
          borderColor="white"
          _focusVisible={{ boxShadow: 'outline' }}
        />
        <RangeSliderThumb
          index={1}
          boxSize={4}
          borderWidth={2}
          borderColor="white"
          _focusVisible={{ boxShadow: 'outline' }}
        />
      </RangeSlider>

      <Flex justify="space-between" mt={1}>
        <Text fontSize="xs" color={muted}>
          {timestamps[0] ? formatTick(timestamps[0]) : ''}
        </Text>
        <Text fontSize="xs" color={muted}>
          {timestamps[maxIdx] ? formatTick(timestamps[maxIdx]) : ''}
        </Text>
      </Flex>
    </Box>
  );
}
