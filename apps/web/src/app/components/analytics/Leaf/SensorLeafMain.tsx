import { Box, VStack } from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import ChartDateRangeDragger from '../../common/ChartDateRangeDragger';
import ChartLastDataShell from '../../common/ChartLastDataShell';
import ChartDateRangeGate from '../../common/ChartDateRangeGate';
import { useBucketed } from '../../common/ChartFrequencyContext';
import {
  filterByTimestampWindow,
  unionSortedTimestamps,
} from '@/app/utils/chartDateWindow';
import SensorLeafLastData from './SensorLeafLastData';
import SensorLeafChart from './SensorLeafChart';
import api from '@agri/api-client/api';
import { CHART_SHELL_MAX_HEIGHT } from '@/app/utils/chartAxisConfig';

type SensorData = {
  timestamp: string;
  value: number;
};

const SensorLeafMain = ({
  filters,
}: {
  filters: {
    startDate: string;
    endDate: string;
    selectedZone: number | null;
  };
}) => {
  const { startDate, endDate, selectedZone } = filters;
  const [moistureData, setMoistureData] = useState<SensorData[]>([]);
  const [temperatureData, setTemperatureData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [moistureRes, temperatureRes] = await Promise.all([
          api.get('api/sensors/leafmoisture/', {
            params: {
              start_date: startDate,
              end_date: endDate,
              zone: selectedZone,
            },
          }),
          api.get('api/sensors/leaftemperature/', {
            params: {
              start_date: startDate,
              end_date: endDate,
              zone: selectedZone,
            },
          }),
        ]);

        setMoistureData(moistureRes.data);
        setTemperatureData(temperatureRes.data);
      } catch (err) {
        console.error('Error fetching leaf data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, selectedZone]);

  // Bucket each series to the page frequency before unioning so the two stay
  // aligned on identical bucket timestamps.
  const moisture = useBucketed(moistureData);
  const temperature = useBucketed(temperatureData);

  const timeline = useMemo(
    () => unionSortedTimestamps(moisture, temperature),
    [moisture, temperature]
  );

  return (
    <ChartLastDataShell
      direction={{ base: 'column', md: 'row' }}
      spacing={2}
      width="100%"
      maxH={CHART_SHELL_MAX_HEIGHT}
      chart={
        <Box flex={3} p={3} minW={0}>
          <ChartDateRangeGate timeline={timeline}>
            {({ startIdx, endIdx, setRange }) => (
              <VStack spacing={0} align="stretch" width="100%">
                <SensorLeafChart
                  temperatureData={filterByTimestampWindow(
                    temperature,
                    timeline,
                    startIdx,
                    endIdx
                  )}
                  moistureData={filterByTimestampWindow(
                    moisture,
                    timeline,
                    startIdx,
                    endIdx
                  )}
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
          <SensorLeafLastData
            temperature={temperatureData[temperatureData.length - 1]}
            moisture={moistureData[moistureData.length - 1]}
          />
        </Box>
      }
    />
  );
};

export default SensorLeafMain;
