'use client';

import { Box, useColorModeValue } from '@chakra-ui/react';
import { CHART_PLOT_HEIGHT_PX } from '@/app/utils/chartAxisConfig';
import EmptyBox from './EmptyBox';

export interface ChartStateViewProps {
  /** When true, shows loading state (spinner + message) */
  loading?: boolean;
  /** When true (and not loading), shows empty state (message only) */
  empty?: boolean;
  /** Message when empty. Default: "Pas de données" */
  emptyText?: string;
  /** Message when loading. Default: "Chargement..." */
  loadingText?: string;
  /** Height of the chart area (loading/empty match this). Default follows CHART_PLOT_HEIGHT_PX in chartAxisConfig. */
  height?: string | number;
  /** Optional ref forwarded to the wrapper Box (e.g. for html2canvas) */
  chartRef?: React.RefObject<HTMLDivElement | null>;
  /** Chart content when not loading and not empty */
  children: React.ReactNode;
}

/**
 * Plug-and-play wrapper for all graph components.
 * Renders loading state, empty state, or chart children consistently.
 * Use for every chart so UX is unified and states are defined in one place.
 */
const ChartStateView = ({
  loading = false,
  empty = false,
  emptyText,
  loadingText,
  height = CHART_PLOT_HEIGHT_PX,
  chartRef,
  children,
}: ChartStateViewProps) => {
  const boxRef = chartRef as React.RefObject<HTMLDivElement> | undefined;
  const chartSurfaceBg = useColorModeValue('white', 'gray.800');

  if (loading) {
    return (
      <Box
        ref={boxRef}
        height={height}
        width="100%"
        bg={chartSurfaceBg}
        borderRadius="md"
      >
        <EmptyBox variant="loading" text={loadingText} />
      </Box>
    );
  }

  if (empty) {
    return (
      <Box
        ref={boxRef}
        height={height}
        width="100%"
        bg={chartSurfaceBg}
        borderRadius="md"
      >
        <EmptyBox variant="empty" text={emptyText} />
      </Box>
    );
  }

  return (
    <Box
      ref={boxRef}
      height={height}
      width="100%"
      bg={chartSurfaceBg}
      borderRadius="md"
      overflow="hidden"
    >
      {children}
    </Box>
  );
};

export default ChartStateView;
