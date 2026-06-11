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
import api from '@agri/api-client/api';
import TempuratureHumidtyChart from './TempuratureHumidtyChart';
import TempuratureHumidtyLastData from './TempuratureHumidtyLastData';
import { CHART_SHELL_MAX_HEIGHT } from '@/app/utils/chartAxisConfig';

interface WeatherData {
  id: number;
  timestamp: string;
  default_unit: string;
  available_units: string[];
  value: number;
  zone: number;
  user: number;
}

const TempuratureHumidtyMain = ({
  filters,
}: {
  filters: {
    startDate: string;
    endDate: string;
    selectedZone: number | null;
  };
}) => {
  const { startDate, endDate, selectedZone } = filters;
  const [humidityData, setHumidityData] = useState<WeatherData[]>([]);
  const [temperatureData, setTemperatureData] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHumidity = api.get<WeatherData[]>('/sensors/humidityweather', {
      params: {
        start_date: startDate,
        end_date: endDate,
        zone: selectedZone,
      },
    });

    const fetchTemperature = api.get<WeatherData[]>(
      '/sensors/temperatureweather',
      {
        params: {
          start_date: startDate,
          end_date: endDate,
          zone: selectedZone,
        },
      }
    );

    Promise.all([fetchHumidity, fetchTemperature])
      .then(([humRes, tempRes]) => {
        setHumidityData(humRes.data);
        setTemperatureData(tempRes.data);
      })
      .catch((err) => console.error('Error fetching weather data:', err))
      .finally(() => setLoading(false));
  }, [startDate, endDate, selectedZone]);

  // Bucket each series to the page frequency first; same-frequency buckets snap
  // to identical timestamps so the union timeline keeps the two series aligned.
  const humidity = useBucketed(humidityData);
  const temperature = useBucketed(temperatureData);

  const timeline = useMemo(
    () => unionSortedTimestamps(humidity, temperature),
    [humidity, temperature]
  );

  return (
    <ChartLastDataShell
      spacing={2}
      direction={{ base: 'column', md: 'row' }}
      align="start"
      width="100%"
      maxH={CHART_SHELL_MAX_HEIGHT}
      className="Box"
      chart={
        <Box flex={3} p={2} width="100%" minW={0}>
          <ChartDateRangeGate timeline={timeline}>
            {({ startIdx, endIdx, setRange }) => (
              <VStack spacing={0} align="stretch" width="100%">
                <TempuratureHumidtyChart
                  humidityData={filterByTimestampWindow(
                    humidity,
                    timeline,
                    startIdx,
                    endIdx
                  )}
                  temperatureData={filterByTimestampWindow(
                    temperature,
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
          width="100%"
          minW={0}
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="stretch"
        >
          <TempuratureHumidtyLastData
            humidityData={humidityData}
            temperatureData={temperatureData}
          />
        </Box>
      }
    />
  );
};

export default TempuratureHumidtyMain;
