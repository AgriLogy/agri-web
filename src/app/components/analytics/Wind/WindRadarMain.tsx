import { Box, VStack } from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import ChartDateRangeGate from '../../common/ChartDateRangeGate';
import ChartLastDataShell from '../../common/ChartLastDataShell';
import { alignWindSeriesByTimestamp } from '@/app/utils/chartDateWindow';
import api from '@/app/lib/api';
import WindRadarLastData from './WindRadarLastData';
import WindRadarChart from './WindRadarChart';

interface WindData {
  id: number;
  timestamp: string;
  default_unit: string;
  available_units: string[];
  value: number;
  zone: number;
  user: number;
}

const WindRadarMain = ({
  filters,
}: {
  filters: {
    startDate: string;
    endDate: string;
    selectedZone: number | null;
  };
}) => {
  const { startDate, endDate, selectedZone } = filters;
  const [speedData, setSpeedData] = useState<WindData[]>([]);
  const [directionData, setDirectionData] = useState<WindData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpeed = api.get<WindData[]>('/sensors/windspeed', {
      params: {
        start_date: startDate,
        end_date: endDate,
        zone: selectedZone,
      },
    });

    const fetchDirection = api.get<WindData[]>('/sensors/winddirection', {
      params: {
        start_date: startDate,
        end_date: endDate,
        zone: selectedZone,
      },
    });

    Promise.all([fetchSpeed, fetchDirection])
      .then(([speedRes, dirRes]) => {
        setSpeedData(speedRes.data);
        setDirectionData(dirRes.data);
      })
      .catch((err) => console.error('Error fetching wind data:', err))
      .finally(() => setLoading(false));
  }, [startDate, endDate, selectedZone]);

  const { timeline, speedAligned, directionAligned } = useMemo(() => {
    const {
      timeline: tl,
      speed,
      direction,
    } = alignWindSeriesByTimestamp(speedData, directionData);
    return { timeline: tl, speedAligned: speed, directionAligned: direction };
  }, [speedData, directionData]);

  return (
    <ChartLastDataShell
      spacing={2}
      direction={{ base: 'column', md: 'row' }}
      align="start"
      width="100%"
      className="Box"
      chart={
        <Box flex={3} p={2} width="100%" minW={0}>
          <ChartDateRangeGate timeline={timeline}>
            {({ startIdx, endIdx }) => (
              <VStack spacing={0} align="stretch" width="100%">
                <WindRadarChart
                  windSpeedData={speedAligned.slice(startIdx, endIdx + 1)}
                  windDirectionData={directionAligned.slice(
                    startIdx,
                    endIdx + 1
                  )}
                  loading={loading}
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
          <WindRadarLastData
            windSpeedData={speedData}
            windDirectionData={directionData}
          />
        </Box>
      }
    />
  );
};

export default WindRadarMain;
