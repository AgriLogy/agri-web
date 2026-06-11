'use client';

import {
  Box,
  IconButton,
  Stack,
  type StackProps,
  Tooltip,
} from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useIsMobile } from '@/app/hooks/useIsMobile';

export type ChartLastDataShellProps = {
  chart: ReactNode;
  lastData: ReactNode;
} & Omit<StackProps, 'children'>;

/**
 * Chart + latest-readings column with a toggle to hide the chart (eye / eye-slash).
 */
export default function ChartLastDataShell({
  chart,
  lastData,
  direction = { base: 'column', md: 'row' },
  spacing = 4,
  align = 'stretch',
  width = '100%',
  /** Use `auto` so content (plot + date dragger) sets height; pass `100%` only inside a sized parent. */
  height = 'auto',
  maxH: _maxH,
  minH,
  ...stackProps
}: ChartLastDataShellProps) {
  const t = useTranslations();
  const isMobile = useIsMobile();
  const [chartVisible, setChartVisible] = useState(true);

  return (
    <Box
      position="relative"
      width={width}
      maxWidth="100%"
      minWidth={0}
      height={height}
      minH={minH}
      overflowX="hidden"
    >
      {/* Hide-chart toggle is a desktop affordance only: on phones it wastes
          the top-right corner and the reserved padding, so we drop it and
          reclaim the full width for the title + plot. */}
      {!isMobile && (
        <Tooltip
          label={
            chartVisible
              ? t('misc.chartLastDataShell.hideChartTooltip')
              : t('misc.chartLastDataShell.showChart')
          }
          hasArrow
          placement="left"
        >
          <IconButton
            aria-label={
              chartVisible
                ? t('misc.chartLastDataShell.hideChart')
                : t('misc.chartLastDataShell.showChart')
            }
            icon={chartVisible ? <FaEyeSlash /> : <FaEye />}
            size="sm"
            variant="ghost"
            colorScheme="brand"
            position="absolute"
            top={0}
            right={0}
            zIndex={4}
            onClick={() => setChartVisible((v) => !v)}
          />
        </Tooltip>
      )}
      <Stack
        direction={direction}
        spacing={spacing}
        width="100%"
        maxWidth="100%"
        minWidth={0}
        height="auto"
        align={align}
        pt={1}
        pr={{ base: 0, md: 10 }}
        {...stackProps}
      >
        {chartVisible ? chart : null}
        {lastData}
      </Stack>
    </Box>
  );
}
