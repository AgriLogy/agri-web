'use client';

import { Box, Text, VStack, HStack, useColorModeValue } from '@chakra-ui/react';
import { useLocale } from 'next-intl';
import React from 'react';
import {
  CHART_TIME_MS_KEY,
  formatXAxisTimestamp,
} from '@/app/utils/chartAxisConfig';
import {
  applySensorCalibration,
  getUnitOverrideFromDataKey,
  getUnitOverrideFromSeriesName,
  resolveSensorKeyForTooltip,
} from '@/app/utils/unitOverrides';

/**
 * Recharts payload item passed to tooltip content.
 * @see https://recharts.org/en-US/api/Tooltip#content
 */
export interface UnifiedTooltipPayloadItem {
  name?: string;
  value?: number | string;
  dataKey?: string;
  color?: string;
  payload?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Props passed by Recharts to custom Tooltip content.
 */
export interface UnifiedTooltipPropsFromRecharts {
  active?: boolean;
  payload?: UnifiedTooltipPayloadItem[];
  /** ISO string for category axes; **milliseconds** when XAxis `type="number"` + `timeMs`. */
  label?: string | number;
}

/**
 * Optional formatters and display options for UnifiedTooltip.
 * Pass these when using <Tooltip content={<UnifiedTooltip ... />} />.
 */
export interface UnifiedTooltipCustomProps {
  /** Format the label (e.g. x-axis value like timestamp or period). Used as fallback when no date is parsed. */
  labelFormatter?: (label: string | number) => string;
  /**
   * Format a single value. Receives value, series name, and full payload item.
   * Return the string to display (e.g. "12.5 %", "100 mm").
   */
  valueFormatter?: (
    value: number | string,
    name: string,
    item: UnifiedTooltipPayloadItem
  ) => string;
  /** Optional unit suffix applied when no valueFormatter is provided (e.g. " %", " mm", " kPa"). */
  valueUnit?: string;
  /** Optional label shown above the values (e.g. "Date", "Timestamp"). */
  labelTitle?: string;
  /**
   * Set when chart `data` points are already calibrated (e.g. via `calibrateChartValue`).
   * Tooltip shows the value as-is and still resolves display units; avoids double-applying a,b.
   */
  valuesAlreadyCalibrated?: boolean;
}

export type UnifiedTooltipProps = UnifiedTooltipPropsFromRecharts &
  UnifiedTooltipCustomProps;

function defaultLabelFormatter(label: string | number): string {
  if (label == null || label === '') return '';
  if (typeof label === 'number' && Number.isFinite(label)) {
    const d = new Date(label);
    if (!Number.isNaN(d.getTime())) {
      return formatXAxisTimestamp(d.toISOString());
    }
    return String(label);
  }
  const s = String(label);
  const dFromString = new Date(s);
  if (!Number.isNaN(dFromString.getTime())) {
    return formatXAxisTimestamp(s);
  }
  const asNum = Number(s);
  if (Number.isFinite(asNum)) {
    const d = new Date(asNum);
    if (!Number.isNaN(d.getTime())) {
      return formatXAxisTimestamp(d.toISOString());
    }
  }
  return s;
}

function defaultValueFormatter(
  value: number | string,
  name: string,
  item: UnifiedTooltipPayloadItem,
  valueUnit?: string,
  valuesAlreadyCalibrated?: boolean
): string {
  const payloadUnit =
    typeof item?.payload?.default_unit === 'string'
      ? String(item.payload.default_unit)
      : undefined;
  const baseUnit = valueUnit ?? payloadUnit ?? '';
  const fromKey = getUnitOverrideFromDataKey(item?.dataKey, baseUnit);
  const unit = getUnitOverrideFromSeriesName(String(name ?? ''), fromKey);
  const sensorKey = resolveSensorKeyForTooltip(
    item?.dataKey as string | undefined,
    String(name ?? '')
  );
  const num = typeof value === 'number' ? value : Number(value);
  const displayNum =
    Number.isFinite(num) && (valuesAlreadyCalibrated || sensorKey != null)
      ? valuesAlreadyCalibrated
        ? num
        : applySensorCalibration(sensorKey!, num)
      : null;
  const str =
    displayNum != null && Number.isFinite(displayNum)
      ? displayNum.toFixed(2)
      : value == null || value === ''
        ? '—'
        : String(value);
  return unit ? `${str} ${unit}` : str;
}

function parseToDate(v: unknown): Date | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === 'string') {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
    const asNum = Number(v);
    if (Number.isFinite(asNum)) {
      const d2 = new Date(asNum);
      return Number.isNaN(d2.getTime()) ? null : d2;
    }
  }
  return null;
}

function extractDateFromRow(
  row: Record<string, unknown> | undefined
): Date | null {
  if (!row) return null;
  const ts = row.timestamp ?? row.name;
  const fromTs = parseToDate(ts);
  if (fromTs) return fromTs;
  const ms = row[CHART_TIME_MS_KEY];
  if (typeof ms === 'number' && Number.isFinite(ms)) {
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function extractDateFromLabel(label: string | number | undefined): Date | null {
  if (label == null || label === '') return null;
  return parseToDate(label);
}

/** Maps the active next-intl locale to a BCP-47 tag for Intl formatting. */
function localeToBcp47(locale: string): string {
  return locale === 'ar' ? 'ar' : locale === 'en' ? 'en-GB' : 'fr-FR';
}

function formatLongDate(d: Date, localeTag: string): string {
  return d.toLocaleString(localeTag, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function resolveBottomContext(
  label: string | number | undefined,
  payload: UnifiedTooltipPayloadItem[] | undefined,
  labelFormatter: (l: string | number) => string,
  localeTag: string
): string {
  const row = payload?.[0]?.payload as Record<string, unknown> | undefined;
  const fromPayload = extractDateFromRow(row);
  if (fromPayload) return formatLongDate(fromPayload, localeTag);
  const fromLabel = extractDateFromLabel(label);
  if (fromLabel) return formatLongDate(fromLabel, localeTag);
  if (label != null && label !== '') return labelFormatter(label);
  return '';
}

/**
 * Unified tooltip for Recharts: series rows (colored dot + name : value), then
 * full French date/time or formatted axis label — same visual pattern as the VPD chart.
 */
const UnifiedTooltip: React.FC<UnifiedTooltipProps> = ({
  active,
  payload,
  label,
  labelFormatter = defaultLabelFormatter,
  valueFormatter,
  valueUnit,
  labelTitle,
  valuesAlreadyCalibrated = false,
}) => {
  const bg = useColorModeValue('white', 'gray.800');
  const accentBorder = useColorModeValue('#3182ce', '#63b3ed');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const footerMuted = useColorModeValue('gray.500', 'gray.400');
  const titleMuted = useColorModeValue('gray.600', 'gray.400');
  const localeTag = localeToBcp47(useLocale());

  if (!active || !payload?.length) {
    return null;
  }

  const formatValue = (
    value: number | string,
    name: string,
    item: UnifiedTooltipPayloadItem
  ) =>
    valueFormatter
      ? valueFormatter(value, name, item)
      : defaultValueFormatter(
          value,
          name,
          item,
          valueUnit,
          valuesAlreadyCalibrated
        );

  const bottomLine = resolveBottomContext(
    label,
    payload,
    labelFormatter,
    localeTag
  );

  return (
    <Box
      bg={bg}
      borderWidth="2px"
      borderColor={accentBorder}
      borderRadius="md"
      boxShadow="md"
      px={3}
      py={2}
      minW="200px"
    >
      {labelTitle ? (
        <Text
          fontSize="xs"
          fontWeight="semibold"
          color={titleMuted}
          textTransform="uppercase"
          letterSpacing="wider"
          mb={2}
        >
          {labelTitle}
        </Text>
      ) : null}
      <VStack align="stretch" spacing={2}>
        {payload.map((item, index) => {
          const name = (item.name ?? item.dataKey ?? '') as string;
          const value = item.value;
          const color = item.color ?? '#3182ce';
          const displayValue = formatValue(
            value as number | string,
            name,
            item
          );
          return (
            <HStack
              key={`${item.dataKey ?? index}-${name}`}
              align="center"
              spacing={2}
            >
              <Box
                w="8px"
                h="8px"
                borderRadius="full"
                bg={color}
                flexShrink={0}
              />
              <Text fontSize="sm" color={textColor} noOfLines={2}>
                {name ? (
                  <>
                    <Text as="span" color={mutedColor}>
                      {name} :{' '}
                    </Text>
                    <Text as="span" fontWeight="semibold">
                      {displayValue}
                    </Text>
                  </>
                ) : (
                  <Text as="span" fontWeight="semibold">
                    {displayValue}
                  </Text>
                )}
              </Text>
            </HStack>
          );
        })}
      </VStack>
      {bottomLine ? (
        <Text fontSize="xs" color={footerMuted} mt={2} lineHeight="short">
          {bottomLine}
        </Text>
      ) : null}
    </Box>
  );
};

export default UnifiedTooltip;
