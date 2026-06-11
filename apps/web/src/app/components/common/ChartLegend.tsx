'use client';

import React, { useMemo } from 'react';
import { Flex, Text, Box, useColorModeValue } from '@chakra-ui/react';

export type LegendIconShape = 'line' | 'square' | 'circle' | 'rect';

export const DEFAULT_LEGEND_FONT_SIZE = 13;
export const DEFAULT_LEGEND_ICON_SIZE = 12;
export const DEFAULT_LEGEND_ICON_SHAPE: LegendIconShape = 'line';

export interface ChartLegendPayloadEntry {
  value: string;
  color: string;
  dataKey?: string;
  [key: string]: unknown;
}

export interface ChartLegendProps {
  payload?: ChartLegendPayloadEntry[];
  /** Font size of legend labels (default: 13) */
  fontSize?: number;
  /** Size of the icon square/circle, or width for line (default: 12) */
  iconSize?: number;
  /** Icon shape: 'line' | 'square' | 'circle' | 'rect' (default: 'line') */
  iconShape?: LegendIconShape;
  /** Called when a legend item is clicked (e.g. to toggle series visibility). */
  onClick?: (entry: ChartLegendPayloadEntry) => void;
  /** dataKeys of series currently hidden — legend row is visually muted. */
  hiddenDataKeys?: string[];
}

/**
 * Minimal legend for Recharts. Use with:
 *   <Legend wrapperStyle={defaultLegendWrapperStyle} content={<ChartLegend />} />
 */
const ChartLegend = ({
  payload,
  fontSize = DEFAULT_LEGEND_FONT_SIZE,
  iconSize = DEFAULT_LEGEND_ICON_SIZE,
  iconShape = DEFAULT_LEGEND_ICON_SHAPE,
  onClick,
  hiddenDataKeys,
}: ChartLegendProps) => {
  const labelColor = useColorModeValue('gray.600', 'gray.400');
  const labelMuted = useColorModeValue('gray.400', 'gray.500');
  const mutedBg = useColorModeValue('blackAlpha.50', 'whiteAlpha.100');

  const hiddenSet = useMemo(
    () => (hiddenDataKeys?.length ? new Set(hiddenDataKeys.map(String)) : null),
    [hiddenDataKeys]
  );

  return (
    <Flex
      as="ul"
      listStyleType="none"
      flexWrap="wrap"
      justify="center"
      gap={{ base: 2, md: 3 }}
      m={0}
      p={0}
      rowGap={2}
    >
      {payload?.map((entry, index) => {
        const dk = String(entry.dataKey ?? '');
        const isHidden = hiddenSet?.has(dk) ?? false;
        return (
          <Flex
            as="li"
            key={`legend-${index}`}
            align="center"
            gap={2}
            px={2.5}
            py={1}
            borderRadius="full"
            bg={mutedBg}
            cursor={onClick ? 'pointer' : undefined}
            onClick={() => onClick?.(entry)}
            onKeyDown={(e) => {
              if (onClick && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onClick(entry);
              }
            }}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            aria-pressed={onClick ? !isHidden : undefined}
            opacity={isHidden ? 0.48 : 1}
            transition="opacity 0.15s ease"
            _hover={onClick ? { opacity: isHidden ? 0.58 : 0.88 } : undefined}
          >
            <Box
              aria-hidden
              flexShrink={0}
              bg={entry.color}
              opacity={isHidden ? 0.55 : 1}
              borderRadius={
                iconShape === 'circle'
                  ? 'full'
                  : iconShape === 'line'
                    ? 'full'
                    : 'sm'
              }
              w={
                iconShape === 'line'
                  ? `${Math.max(14, iconSize * 1.75)}px`
                  : `${iconSize}px`
              }
              h={
                iconShape === 'line'
                  ? '3px'
                  : iconShape === 'rect'
                    ? `${Math.round(iconSize * 0.65)}px`
                    : `${iconSize}px`
              }
            />
            <Text
              as="span"
              fontSize={`${fontSize}px`}
              fontWeight="medium"
              letterSpacing="tight"
              color={isHidden ? labelMuted : labelColor}
              whiteSpace="nowrap"
            >
              {entry.value}
            </Text>
          </Flex>
        );
      })}
    </Flex>
  );
};

export default ChartLegend;
