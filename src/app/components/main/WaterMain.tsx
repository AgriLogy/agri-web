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

import CumulPrecipitationMain from '../analytics/CumulPrecipitation/CumulPrecipitationMain';
import EcWaterMain from '../analytics/WaterEc/EcWaterMain';
import WaterFlowMain from '../analytics/WaterFlow/WaterFlowMain';
import PhWaterMain from '../analytics/WaterPh/PhWaterMain';
import WaterPressureMain from '../analytics/WaterPressure/WaterPressureMain';

const WaterMain = () => {
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
        title={t('shell.water.title')}
        subtitle={pageSubtitle({
          zoneName,
          startDate: range.startDate,
          endDate: range.endDate,
          t,
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
              zoneName={zoneName ?? t('shell.water.zoneFallback')}
            />
          ) : null
        }
      />

      <ChartFrequencyProvider value={frequency}>
        <Stack spacing={{ base: 3, md: 4 }} minW={0}>
          {activeGraph?.water_flow_status && (
            <ChartSection>
              <WaterFlowMain filters={filters} />
            </ChartSection>
          )}
          {activeGraph?.water_pressure_status && (
            <ChartSection>
              <WaterPressureMain filters={filters} />
            </ChartSection>
          )}
          {activeGraph?.water_ph_status && (
            <ChartSection>
              <PhWaterMain filters={filters} />
            </ChartSection>
          )}
          {activeGraph?.water_ec_status && (
            <ChartSection>
              <EcWaterMain filters={filters} />
            </ChartSection>
          )}
          {activeGraph?.cumulative_precipitation_status && (
            <ChartSection>
              <CumulPrecipitationMain filters={filters} />
            </ChartSection>
          )}
        </Stack>
      </ChartFrequencyProvider>
    </Box>
  );
};

export default WaterMain;
