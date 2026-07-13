import { Box, VStack } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import ChartDateRangeDragger from '../../common/ChartDateRangeDragger';
import ChartLastDataShell from '../../common/ChartLastDataShell';
import ChartDateRangeGate from '../../common/ChartDateRangeGate';
import {
  useBucketed,
  useFrequencySeries,
} from '../../common/ChartFrequencyContext';
import api from '@agri/api-client/api';
import {
  readWeatherLocation,
  WEATHER_LOCATION_UPDATED_EVENT,
} from '@agri/api-client';
import ET0LastData from './ET0LastData';
import ET0Chart from './ET0Chart';
import { CHART_SHELL_MAX_HEIGHT } from '@/app/utils/chartAxisConfig';

interface ET0Data {
  id: number;
  timestamp: string;
  default_unit: string;
  available_units: string[];
  value: number;
  zone: number;
  user: number;
}

const ET0Main = ({
  filters,
}: {
  filters: {
    startDate: string;
    endDate: string;
    selectedZone: number | null;
  };
}) => {
  const { startDate, endDate, selectedZone } = filters;

  const [weatherData, setWeatherData] = useState<ET0Data[]>([]);
  const [calculatedData, setCalculatedData] = useState<ET0Data[]>([]);
  const [openMeteoData, setOpenMeteoData] = useState<ET0Data[]>([]);
  const [loading, setLoading] = useState(true);
  // Bumped when the picked weather location changes so the Open-Meteo
  // reference series re-fetches against the new coordinates.
  const [locationVersion, setLocationVersion] = useState(0);

  useEffect(() => {
    const bump = () => setLocationVersion((v) => v + 1);
    window.addEventListener(WEATHER_LOCATION_UPDATED_EVENT, bump);
    return () =>
      window.removeEventListener(WEATHER_LOCATION_UPDATED_EVENT, bump);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {
      start_date: startDate,
      end_date: endDate,
      zone: selectedZone ?? undefined,
    };

    const fetchWeather = api.get<ET0Data[]>('/sensors/et0weather', {
      params,
    });
    const fetchCalculated = api.get<ET0Data[]>('/sensors/et0calculated', {
      params,
    });
    // Real Open-Meteo daily reference ET₀ over the same range — best-effort, so
    // a failure here must not blank the whole chart. Anchor it to the farmer's
    // picked weather location (client-side); the backend falls back to
    // account/zone coordinates when it's unset.
    const loc = readWeatherLocation();
    const seriesParams = loc
      ? { ...params, lat: loc.lat, lon: loc.lon }
      : params;
    const fetchOpenMeteo = api
      .get<ET0Data[]>('/weather/et0-series', { params: seriesParams })
      .catch(() => ({ data: [] as ET0Data[] }));

    Promise.all([fetchWeather, fetchCalculated, fetchOpenMeteo])
      .then(([weatherRes, calculatedRes, openMeteoRes]) => {
        setWeatherData(weatherRes.data);
        setCalculatedData(calculatedRes.data);
        setOpenMeteoData(openMeteoRes.data);
      })
      .catch((err) => {
        console.error('Failed to fetch ET0 sensor data:', err);
      })
      .finally(() => setLoading(false));
  }, [startDate, endDate, selectedZone, locationVersion]);

  const { series: sortedWeather, timeline } = useFrequencySeries(weatherData);
  const calculated = useBucketed(calculatedData);

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
                <ET0Chart
                  weatherData={sortedWeather.slice(startIdx, endIdx + 1)}
                  calculatedData={calculated}
                  openMeteoData={openMeteoData}
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
          <ET0LastData
            weatherData={weatherData}
            calculatedData={calculatedData}
          />
        </Box>
      }
    />
  );
};

export default ET0Main;
