'use client';

import { Box, Stack } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';

import ZoneNotificationBell from '@/app/components/common/ZoneNotificationBell';
import { ChartFrequencyProvider } from '@/app/components/common/ChartFrequencyContext';
import { ChartDateRangeControl } from '@/app/components/layout/ChartDateRangeControl';
import { ChartFrequencyControl } from '@/app/components/layout/ChartFrequencyControl';
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
    frequency,
    setFrequency,
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
        frequencyControl={
          <ChartFrequencyControl value={frequency} onChange={setFrequency} />
        }
        actions={
          selectedZone != null ? (
            <ZoneNotificationBell
              zoneId={selectedZone}
              zoneName={zoneName ?? t('shell.common.zoneFallback')}
            />
          ) : null
        }
      />

      <ChartFrequencyProvider value={frequency}>
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
      </ChartFrequencyProvider>
    </Box>
  );
};

export default PlantMain;
