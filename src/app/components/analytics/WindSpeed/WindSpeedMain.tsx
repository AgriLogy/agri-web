import { Box, VStack } from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import ChartDateRangeDragger from '../../common/ChartDateRangeDragger';
import ChartLastDataShell from '../../common/ChartLastDataShell';
import ChartDateRangeGate from '../../common/ChartDateRangeGate';
import { sortByTimestamp } from '@/app/utils/chartDateWindow';
import { SensorData } from '@/app/types';
import api from '@/app/lib/api';
import { logOptionalApiFailure } from '@/app/utils/apiClientErrors';
import { type WindSpeedSensorRow } from '@/app/utils/windSpeedMerge';
import '@/app/styles/style.module.css';
import WindSpeedChart from './WindSpeedChart';
import WindSpeedLastData from './WindSpeedLastData';
import { CHART_SHELL_MAX_HEIGHT } from '@/app/utils/chartAxisConfig';

const WindSpeedMain = ({
  filters,
}: {
  filters: {
    startDate: string;
    endDate: string;
    selectedZone: number | null;
  };
}) => {
  const { startDate, endDate, selectedZone } = filters;
  const [data, setData] = useState<WindSpeedSensorRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = {
      start_date: startDate,
      end_date: endDate,
      zone: selectedZone,
    };
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        // wind_gust (rafale) is not yet a backend sensor (modifications #6 —
        // needs raw high-frequency samples). Until then, fetch wind speed only;
        // the dead /sensors/windgust calls were 404-ing on every load.
        const speedRes = await api.get<SensorData[]>('/sensors/windspeed', {
          params,
        });
        if (cancelled) return;
        setData((speedRes.data ?? []).map((s) => ({ ...s })));
      } catch (error) {
        logOptionalApiFailure('WindSpeedMain: windspeed', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [startDate, endDate, selectedZone]);

  const sortedData = useMemo(() => sortByTimestamp(data), [data]);
  const timeline = useMemo(
    () => sortedData.map((d) => d.timestamp),
    [sortedData]
  );

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
                <WindSpeedChart
                  data={sortedData.slice(startIdx, endIdx + 1)}
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
          <WindSpeedLastData data={data} />
        </Box>
      }
    />
  );
};

export default WindSpeedMain;
