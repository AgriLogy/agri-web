import { useColorModeValue } from '@chakra-ui/react';

/**
 * Consistent Recharts axis / grid / muted-series colors for light vs dark UI.
 */
export function useChartAxisColors() {
  const axis = useColorModeValue('#64748b', '#94a3b8');
  /** Tick label fill — matches shared axis theme in chartAxisConfig */
  const tickFill = useColorModeValue('#64748b', '#cbd5e1');
  const mutedSeries = useColorModeValue('#94a3b8', '#718096');
  const grid = useColorModeValue('#e2e8f0', '#4a5568');
  return { axis, tickFill, mutedSeries, grid };
}
