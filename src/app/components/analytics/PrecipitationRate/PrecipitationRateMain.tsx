import { Box, VStack } from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import ChartDateRangeDragger from '../../common/ChartDateRangeDragger';
import ChartLastDataShell from '../../common/ChartLastDataShell';
import ChartDateRangeGate from '../../common/ChartDateRangeGate';
import { sortByTimestamp } from '@/app/utils/chartDateWindow';
import { SensorData } from '@/app/types';
import api from '@/app/lib/api';
import '@/app/styles/style.module.css';
import PrecipitationRateChart from './PrecipitationRateChart';
import PrecipitationRateLastData from './WatePrecipitationRateLastData';
import { CHART_SHELL_MAX_HEIGHT } from '@/app/utils/chartAxisConfig';

const PrecipitationRateMain = ({
  filters,
}: {
  filters: {
    startDate: string;
    endDate: string;
    selectedZone: number | null;
  };
}) => {
  const { startDate, endDate, selectedZone } = filters;
  const [data, setData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<SensorData[]>('/sensors/precipitationrate', {
        params: {
          start_date: startDate,
          end_date: endDate,
          zone: selectedZone,
        },
      })
      .then((res) => setData(res.data))
      .catch((err) =>
        console.error('Failed to fetch precipitationrate data:', err)
      )
      .finally(() => setLoading(false));
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
      maxH={CHART_SHELL_MAX_HEIGHT}
      className="Box"
      chart={
        <Box flex={3} p={2} width="100%" minW={0}>
          <ChartDateRangeGate timeline={timeline}>
            {({ startIdx, endIdx, setRange }) => (
              <VStack spacing={0} align="stretch" width="100%">
                <PrecipitationRateChart
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
          <PrecipitationRateLastData data={data} />
        </Box>
      }
    />
  );
};

export default PrecipitationRateMain;
