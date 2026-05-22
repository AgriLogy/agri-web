'use client';

import { Box, VStack } from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import ChartDateRangeDragger from '../../common/ChartDateRangeDragger';
import ChartLastDataShell from '../../common/ChartLastDataShell';
import ChartDateRangeGate from '../../common/ChartDateRangeGate';
import api from '@/app/lib/api';
import { SensorData } from '@/app/types';
import SoilTemperatureChart from './SoilTemperatureChart';
import SoilTemperatureLastData from './SoilTemperatureLastData';
import { CHART_SHELL_MAX_HEIGHT } from '@/app/utils/chartAxisConfig';

export type TemperaturePoint = {
  timestamp: string;
  low?: number;
  medium?: number;
  high?: number;
};

const SoilTemperatureMain = ({
  filters,
}: {
  filters: { startDate: string; endDate: string; selectedZone: number | null };
}) => {
  const { startDate, endDate, selectedZone } = filters;

  const [data, setData] = useState<TemperaturePoint[]>([]);
  const [loading, setLoading] = useState(true);

  // last items per depth
  const [lastLow, setLastLow] = useState<SensorData | undefined>();
  const [lastMedium, setLastMedium] = useState<SensorData | undefined>();
  const [lastHigh, setLastHigh] = useState<SensorData | undefined>();

  useEffect(() => {
    setLoading(true);

    const fetchSeries = (endpoint: string) =>
      api.get<SensorData[]>(endpoint, {
        params: {
          start_date: startDate,
          end_date: endDate,
          zone: selectedZone,
        },
      });

    Promise.all([
      fetchSeries('/api/sensors/soiltemperaturelow/'),
      fetchSeries('/api/sensors/soiltemperaturemedium/'),
      fetchSeries('/api/sensors/soiltemperaturehigh/'),
    ])
      .then(([lowRes, medRes, highRes]) => {
        const map = new Map<string, TemperaturePoint>();

        lowRes.data.forEach((d) => {
          if (!map.has(d.timestamp))
            map.set(d.timestamp, { timestamp: d.timestamp });
          map.get(d.timestamp)!.low = d.value;
        });

        medRes.data.forEach((d) => {
          if (!map.has(d.timestamp))
            map.set(d.timestamp, { timestamp: d.timestamp });
          map.get(d.timestamp)!.medium = d.value;
        });

        highRes.data.forEach((d) => {
          if (!map.has(d.timestamp))
            map.set(d.timestamp, { timestamp: d.timestamp });
          map.get(d.timestamp)!.high = d.value;
        });

        const merged = Array.from(map.values()).sort((a, b) =>
          a.timestamp.localeCompare(b.timestamp)
        );
        setData(merged);

        setLastLow(lowRes.data.at(-1));
        setLastMedium(medRes.data.at(-1));
        setLastHigh(highRes.data.at(-1));
      })
      .catch((err) => console.error('Failed to fetch soil temperature:', err))
      .finally(() => setLoading(false));
  }, [startDate, endDate, selectedZone]);

  const timeline = useMemo(() => data.map((d) => d.timestamp), [data]);

  return (
    <ChartLastDataShell
      direction={{ base: 'column', md: 'row' }}
      align="start"
      width="100%"
      maxH={CHART_SHELL_MAX_HEIGHT}
      spacing={5}
      chart={
        <Box flex={3} p={2} width="100%" minW={0}>
          <ChartDateRangeGate timeline={timeline}>
            {({ startIdx, endIdx, setRange }) => (
              <VStack spacing={0} align="stretch" width="100%">
                <SoilTemperatureChart
                  data={data.slice(startIdx, endIdx + 1)}
                  loading={loading}
                />
                <ChartDateRangeDragger
                  timestamps={timeline}
                  startIdx={startIdx}
                  endIdx={endIdx}
                  onChange={(r) => setRange(r)}
                />
              </VStack>
            )}
          </ChartDateRangeGate>
        </Box>
      }
      lastData={
        <Box
          flex={1}
          p={3}
          width="100%"
          minW={0}
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="stretch"
        >
          <SoilTemperatureLastData
            lastLow={lastLow}
            lastMedium={lastMedium}
            lastHigh={lastHigh}
          />
        </Box>
      }
    />
  );
};

export default SoilTemperatureMain;
