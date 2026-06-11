import { useEffect, useMemo, useState } from 'react';
import { Box, VStack } from '@chakra-ui/react';
import api from '@agri/api-client/api';
import ChartLastDataShell from '../../common/ChartLastDataShell';
import type { WaterSoilData } from '@/app/types';
import WaterSoilChart from './WaterSoilChart';
import WaterSoilLastData from './WaterSoilLastData';
import ChartDateRangeDragger from '../../common/ChartDateRangeDragger';
import ChartDateRangeGate from '../../common/ChartDateRangeGate';
import { useBucketed } from '../../common/ChartFrequencyContext';
import { filterByTimestampWindow } from '@/app/utils/chartDateWindow';

interface SensorEntry {
  id: number;
  timestamp: string;
  value: number;
  default_unit: string;
  available_units: string[];
  zone: number;
  user: number;
}

const WaterSoilMain = ({
  filters,
}: {
  filters: {
    startDate: string;
    endDate: string;
    selectedZone: number | null;
  };
}) => {
  const { startDate, endDate, selectedZone } = filters;
  const [mergedData, setMergedData] = useState<WaterSoilData[]>([]);
  const [loading, setLoading] = useState(true);

  const [soilLowLast, setSoilLowLast] = useState<SensorEntry | undefined>();
  const [soilMediumLast, setSoilMediumLast] = useState<
    SensorEntry | undefined
  >();
  const [soilHighLast, setSoilHighLast] = useState<SensorEntry | undefined>();
  const [waterFlowLast, setWaterFlowLast] = useState<SensorEntry | undefined>();

  useEffect(() => {
    const fetchSensor = (endpoint: string) =>
      api.get<SensorEntry[]>(endpoint, {
        params: {
          start_date: startDate,
          end_date: endDate,
          zone: selectedZone,
        },
      });

    Promise.all([
      fetchSensor('/sensors/soilmoisturelow'),
      fetchSensor('/sensors/soilmoisturemedium'),
      fetchSensor('/sensors/soilmoisturehigh'),
      fetchSensor('/sensors/waterflow'),
    ])
      .then(([lowRes, medRes, highRes, waterRes]) => {
        const map = new Map<string, WaterSoilData>();

        lowRes.data.forEach((item) => {
          if (!map.has(item.timestamp))
            map.set(item.timestamp, { timestamp: item.timestamp });
          map.get(item.timestamp)!.soilLow = item.value;
        });

        medRes.data.forEach((item) => {
          if (!map.has(item.timestamp))
            map.set(item.timestamp, { timestamp: item.timestamp });
          map.get(item.timestamp)!.soilMedium = item.value;
        });

        highRes.data.forEach((item) => {
          if (!map.has(item.timestamp))
            map.set(item.timestamp, { timestamp: item.timestamp });
          map.get(item.timestamp)!.soilHigh = item.value;
        });

        waterRes.data.forEach((item) => {
          if (!map.has(item.timestamp))
            map.set(item.timestamp, { timestamp: item.timestamp });
          map.get(item.timestamp)!.waterFlow = item.value;
        });

        const sorted = Array.from(map.values()).sort((a, b) =>
          a.timestamp.localeCompare(b.timestamp)
        );
        setMergedData(sorted);

        setSoilLowLast(lowRes.data.at(-1));
        setSoilMediumLast(medRes.data.at(-1));
        setSoilHighLast(highRes.data.at(-1));
        setWaterFlowLast(waterRes.data.at(-1));
      })
      .catch((err) => console.error('Failed to fetch sensor data:', err))
      .finally(() => setLoading(false));
  }, [startDate, endDate, selectedZone]);

  // Bucket the merged soil-moisture + water-flow series to the page frequency.
  const merged = useBucketed(mergedData);
  const timeline = useMemo(() => merged.map((d) => d.timestamp), [merged]);

  return (
    <ChartLastDataShell
      direction={{ base: 'column', md: 'row' }}
      width="100%"
      spacing={4}
      chart={
        <Box flex={3} p={3} minW={0} maxW="100%" minH={100}>
          <ChartDateRangeGate timeline={timeline}>
            {({ startIdx, endIdx, setRange }) => (
              <VStack spacing={0} align="stretch" width="100%">
                <WaterSoilChart
                  data={filterByTimestampWindow(
                    merged,
                    timeline,
                    startIdx,
                    endIdx
                  )}
                  waterFlowDefaultUnit={waterFlowLast?.default_unit}
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
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="stretch"
          width="100%"
          minW={0}
        >
          <WaterSoilLastData
            soilLow={soilLowLast}
            soilMedium={soilMediumLast}
            soilHigh={soilHighLast}
            waterFlow={waterFlowLast}
          />
        </Box>
      }
    />
  );
};

export default WaterSoilMain;
