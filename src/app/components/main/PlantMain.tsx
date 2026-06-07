'use client';

import { Box, HStack, Stack } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';

import DeviceStatusIndicator from '@/app/components/common/DeviceStatusIndicator';
import ZoneNotificationBell from '@/app/components/common/ZoneNotificationBell';
import { ChartDateRangeControl } from '@/app/components/layout/ChartDateRangeControl';
import { ChartSection } from '@/app/components/layout/ChartSection';
import { PageInfoBar } from '@/app/components/layout/PageInfoBar';
import { ZoneSelect } from '@/app/components/layout/ZoneSelect';
import { pageSubtitle } from '@/app/components/layout/pageSubtitle';
import { useAnalyticsHeader } from '@/app/components/layout/useAnalyticsHeader';

import FruiteSizeMain from '../analytics/fruiteSize/FruiteSizeMain';
import LargeFruitDiameterMain from '../analytics/LargeFruitDiameter/LargeFruitDiameterMain';
import SensorLeafMain from '../analytics/Leaf/SensorLeafMain';

const PlantMain = () => {
  const t = useTranslations();
  const {
    zones,
    selectedZone,
    setSelectedZone,
    zoneName,
    range,
    setRange,
    activeGraph,
    filters,
  } = useAnalyticsHeader();

  return (
    <Box px={{ base: 3, md: 4 }} py={{ base: 3, md: 4 }}>
      <PageInfoBar
        title={t('shell.plant.title')}
        subtitle={pageSubtitle({
          zoneName,
          startDate: range.startDate,
          endDate: range.endDate,
        })}
        zoneControl={
          <ZoneSelect
            zones={zones}
            value={selectedZone}
            onChange={setSelectedZone}
          />
        }
        dateRange={<ChartDateRangeControl value={range} onChange={setRange} />}
        actions={
          <HStack spacing={2}>
            <DeviceStatusIndicator zoneId={selectedZone} />
            {selectedZone != null ? (
              <ZoneNotificationBell
                zoneId={selectedZone}
                zoneName={zoneName ?? t('shell.common.zoneFallback')}
              />
            ) : null}
          </HStack>
        }
      />

      <Stack spacing={{ base: 3, md: 4 }} minW={0}>
        {activeGraph?.fruit_size_status && (
          <ChartSection>
            <FruiteSizeMain filters={filters} />
          </ChartSection>
        )}
        {activeGraph?.large_fruit_diameter_status && (
          <ChartSection>
            <LargeFruitDiameterMain filters={filters} />
          </ChartSection>
        )}
        {activeGraph?.leaf_sensor_status && (
          <ChartSection>
            <SensorLeafMain filters={filters} />
          </ChartSection>
        )}
      </Stack>
    </Box>
  );
};

export default PlantMain;
