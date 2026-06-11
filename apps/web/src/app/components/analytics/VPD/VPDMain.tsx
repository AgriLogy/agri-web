import { Box, VStack } from '@chakra-ui/react';
import ChartDateRangeDragger from '../../common/ChartDateRangeDragger';
import ChartLastDataShell from '../../common/ChartLastDataShell';
import ChartDateRangeGate from '../../common/ChartDateRangeGate';
import { useChartFrequency } from '../../common/ChartFrequencyContext';
import {
  averageByFrequency,
  sortByTimestamp,
} from '@/app/utils/chartDateWindow';
import { useEffect, useMemo, useState } from 'react';
import api from '@agri/api-client/api';
import { logOptionalApiFailure } from '@/app/utils/apiClientErrors';
import { useUnitOverridesRevision } from '@/app/hooks/useUnitOverridesRevision';
import { calibrateChartValue } from '@/app/utils/chartSeriesCalibration';
import { calculateVPD } from '@/app/utils/calculateVPD';
import VPDChart, { type VPDDataPoint } from './VPDChart';
import VPDLastData from './VPDLastData';
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

const VPDMain = ({
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
  const unitRev = useUnitOverridesRevision();
  const freq = useChartFrequency();

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
      .catch((err) =>
        logOptionalApiFailure('VPDMain: fetch humidity/temperature', err)
      )
      .finally(() => setLoading(false));
  }, [startDate, endDate, selectedZone]);

  const series = useMemo((): VPDDataPoint[] => {
    const tempMap = new Map<string, number>(
      temperatureData.map((t) => [t.timestamp, t.value])
    );
    const rows = humidityData
      .map((h) => {
        const temp = tempMap.get(h.timestamp);
        if (temp == null || Number.isNaN(temp)) return null;
        const vpdRaw = calculateVPD(
          calibrateChartValue('temperature_weather', temp),
          calibrateChartValue('humidity_weather', h.value)
        );
        const vpd = calibrateChartValue('vpd', vpdRaw);
        return { timestamp: h.timestamp, vpd };
      })
      .filter((d): d is VPDDataPoint => d != null);
    // Bucket the computed VPD series to the page frequency (avg per bucket).
    return averageByFrequency(sortByTimestamp(rows), freq);
  }, [humidityData, temperatureData, unitRev, freq]);

  const timeline = useMemo(() => series.map((d) => d.timestamp), [series]);

  return (
    <ChartLastDataShell
      spacing={2}
      direction={{ base: 'column', md: 'row' }}
      align="start"
      width="100%"
      className="Box"
      maxH={CHART_SHELL_MAX_HEIGHT}
      chart={
        <Box flex={3} p={2} width="100%" minW={0}>
          <ChartDateRangeGate timeline={timeline}>
            {({ startIdx, endIdx, setRange }) => (
              <VStack spacing={0} align="stretch" width="100%">
                <VPDChart
                  data={series.slice(startIdx, endIdx + 1)}
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
          <VPDLastData data={series} />
        </Box>
      }
    />
  );
};

export default VPDMain;
