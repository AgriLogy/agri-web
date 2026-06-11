import { Box, VStack } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import ChartDateRangeDragger from '../../common/ChartDateRangeDragger';
import ChartLastDataShell from '../../common/ChartLastDataShell';
import ChartDateRangeGate from '../../common/ChartDateRangeGate';
import { useFrequencySeries } from '../../common/ChartFrequencyContext';
import api from '@/app/lib/api';
import '@/app/styles/style.module.css';
import NpkLastData from './NpkLastData';
import NpkSizeChart from './NpkSizeChart';
import { NpkSensorData } from '@/app/types';
import { CHART_SHELL_MAX_HEIGHT } from '@/app/utils/chartAxisConfig';

const NpkMain = ({
  filters,
}: {
  filters: {
    startDate: string;
    endDate: string;
    selectedZone: number | null;
  };
}) => {
  const { startDate, endDate, selectedZone } = filters;
  const [data, setData] = useState<NpkSensorData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<NpkSensorData[]>('/sensors/npk', {
        params: {
          start_date: startDate,
          end_date: endDate,
          zone: selectedZone,
        },
      })
      .then((res) => setData(res.data))
      .catch((err) => console.error('Failed to fetch NPK sensor data:', err))
      .finally(() => setLoading(false));
  }, [startDate, endDate, selectedZone]);

  const { series: sortedData, timeline } = useFrequencySeries(data);
  return (
    <ChartLastDataShell
      spacing={2}
      direction={{ base: 'column', md: 'row' }}
      align="center"
      width="100%"
      maxH={CHART_SHELL_MAX_HEIGHT}
      className="Box"
      chart={
        <Box flex={3} p={2} width="100%" minW={0}>
          <ChartDateRangeGate timeline={timeline}>
            {({ startIdx, endIdx, setRange }) => (
              <VStack spacing={0} align="stretch" width="100%">
                <NpkSizeChart
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
          <NpkLastData data={data} />
        </Box>
      }
    />
  );
};

export default NpkMain;
