import { Box, VStack } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import ChartDateRangeDragger from '../../common/ChartDateRangeDragger';
import ChartLastDataShell from '../../common/ChartLastDataShell';
import ChartDateRangeGate from '../../common/ChartDateRangeGate';
import { useFrequencySeries } from '../../common/ChartFrequencyContext';
import { SensorData } from '@/app/types';
import api from '@agri/api-client/api';
import { logOptionalApiFailure } from '@/app/utils/apiClientErrors';
import WaterLevelChart from './WaterLevelChart';
import WaterLevelLastData, { type BasinGeometry } from './WaterLevelLastData';
import { CHART_SHELL_MAX_HEIGHT } from '@/app/utils/chartAxisConfig';

const WaterLevelMain = ({
  filters,
  basin,
}: {
  filters: {
    startDate: string;
    endDate: string;
    selectedZone: number | null;
  };
  basin: BasinGeometry;
}) => {
  const { startDate, endDate, selectedZone } = filters;
  const [data, setData] = useState<SensorData[]>([]);
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
        const res = await api.get<SensorData[]>('/sensors/waterlevel', {
          params,
        });
        if (cancelled) return;
        setData(res.data ?? []);
      } catch (error) {
        logOptionalApiFailure('WaterLevelMain: waterlevel', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [startDate, endDate, selectedZone]);

  const { series: sortedData, timeline } = useFrequencySeries(data);

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
                <WaterLevelChart
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
          <WaterLevelLastData data={data} basin={basin} />
        </Box>
      }
    />
  );
};

export default WaterLevelMain;
