import { Box, VStack } from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import ChartDateRangeDragger from '../../common/ChartDateRangeDragger';
import ChartLastDataShell from '../../common/ChartLastDataShell';
import ChartDateRangeGate from '../../common/ChartDateRangeGate';
import {
  filterByTimestampWindow,
  unionSortedTimestamps,
} from '@/app/utils/chartDateWindow';
import api from '@/app/lib/api';
import SoilConductivityLastData from './SoilConductivityLastData';
import SoilConductivityChart from './SoilConductivityChart';
import { SensorData } from '@/app/types';
import { CHART_SHELL_MAX_HEIGHT } from '@/app/utils/chartAxisConfig';

const SoilConductivityMain = ({
  filters,
}: {
  filters: {
    startDate: string;
    endDate: string;
    selectedZone: number | null;
  };
}) => {
  const { startDate, endDate, selectedZone } = filters;
  const [lowData, setLowData] = useState<SensorData[]>([]);
  const [highData, setHighData] = useState<SensorData[]>([]);
  const [flowData, setFlowData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    const params = {
      start_date: startDate,
      end_date: endDate,
      zone: selectedZone,
    };

    Promise.all([
      api.get<SensorData[]>('/sensors/ecsoillow', { params }),
      api.get<SensorData[]>('/sensors/ecsoilhigh', { params }),
      api.get<SensorData[]>('/sensors/waterflow', { params }),
    ])
      .then(([lowRes, highRes, flowRes]) => {
        setLowData(lowRes.data);
        setHighData(highRes.data);
        setFlowData(flowRes.data);
      })
      .catch((err) => console.error('Soil conductivity fetch error:', err))
      .finally(() => setLoading(false));
  }, [startDate, endDate, selectedZone]);

  const timeline = useMemo(
    () => unionSortedTimestamps(lowData, highData, flowData),
    [lowData, highData, flowData]
  );

  return (
    <ChartLastDataShell
      spacing={2}
      direction={{ base: 'column', md: 'row' }}
      align="start"
      width="100%"
      maxH={CHART_SHELL_MAX_HEIGHT}
      chart={
        <Box flex={3} p={2} width="100%" minW={0}>
          <ChartDateRangeGate timeline={timeline}>
            {({ startIdx, endIdx, setRange }) => (
              <VStack spacing={0} align="stretch" width="100%">
                <SoilConductivityChart
                  lowData={filterByTimestampWindow(
                    lowData,
                    timeline,
                    startIdx,
                    endIdx
                  )}
                  highData={filterByTimestampWindow(
                    highData,
                    timeline,
                    startIdx,
                    endIdx
                  )}
                  flowData={filterByTimestampWindow(
                    flowData,
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
          <SoilConductivityLastData
            lowData={lowData}
            highData={highData}
            flowData={flowData}
          />
        </Box>
      }
    />
  );
};

export default SoilConductivityMain;
