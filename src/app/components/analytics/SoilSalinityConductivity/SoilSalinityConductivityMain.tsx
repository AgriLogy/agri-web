import { Box, VStack } from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import ChartDateRangeDragger from '../../common/ChartDateRangeDragger';
import ChartLastDataShell from '../../common/ChartLastDataShell';
import ChartDateRangeGate from '../../common/ChartDateRangeGate';
import {
  filterByTimestampWindow,
  unionSortedTimestamps,
} from '@/app/utils/chartDateWindow';
import { SensorData } from '@/app/types';

import SoilSalinityConductivityLastData from './SoilSalinityConductivityLastData';
import SoilSalinityConductivityChart from './SoilSalinityConductivityChart';

import '@/app/styles/style.module.css';
import api from '@/app/lib/api';
import { CHART_SHELL_MAX_HEIGHT } from '@/app/utils/chartAxisConfig';

const SoilSalinityConductivityMain = ({
  filters,
}: {
  filters: {
    startDate: string;
    endDate: string;
    selectedZone: number | null;
    // Add more fields here as needed in the future
  };
}) => {
  const { startDate, endDate, selectedZone } = filters;
  const [Salinitydata, setSalinityData] = useState<SensorData[]>([]);
  const [Conductivitydata, setConductivityData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<SensorData[]>('/sensors/soilsalinity', {
        params: {
          start_date: startDate,
          end_date: endDate,
          zone: selectedZone,
        },
      })
      .then((res) => setSalinityData(res.data))
      .catch((err) => console.error('Failed to fetch fruit size data:', err))
      .finally(() => setLoading(false));

    api
      .get<SensorData[]>('/sensors/soilconductivity', {
        params: {
          start_date: startDate,
          end_date: endDate,
          zone: selectedZone,
        },
      })
      .then((res) => setConductivityData(res.data))
      .catch((err) => console.error('Failed to fetch fruit size data:', err))
      .finally(() => setLoading(false));
  }, [startDate, endDate, selectedZone]);

  const timeline = useMemo(
    () => unionSortedTimestamps(Salinitydata, Conductivitydata),
    [Salinitydata, Conductivitydata]
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
                <SoilSalinityConductivityChart
                  salinityData={filterByTimestampWindow(
                    Salinitydata,
                    timeline,
                    startIdx,
                    endIdx
                  )}
                  conductivityData={filterByTimestampWindow(
                    Conductivitydata,
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
          <SoilSalinityConductivityLastData
            salinityData={Salinitydata}
            conductivityData={Conductivitydata}
          />
        </Box>
      }
    />
  );
};

export default SoilSalinityConductivityMain;
