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

import NpkMain from '../analytics/npk/NpkMain';
import PhSoilMain from '../analytics/SoilPh/PhSoilMain';
import SoilConductivityIrrigationMain from '../analytics/SoilConductivityIrrigation/SoilConductivityIrrigationMain';
import SoilSalinityConductivityMain from '../analytics/SoilSalinityConductivity/SoilSalinityConductivityMain';
import SoilTemperatureMain from '../analytics/SoilTemperature/SoilTemperatureMain';
import WaterSoilMain from '../analytics/SoilWater/WaterSoilMain';

const SoilMain = () => {
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
        title={t('shell.soil.title')}
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
        {activeGraph?.soil_irrigation_status && (
          <ChartSection>
            <WaterSoilMain filters={filters} />
          </ChartSection>
        )}
        {activeGraph?.soil_temperature_status && (
          <ChartSection>
            <SoilTemperatureMain filters={filters} />
          </ChartSection>
        )}
        {activeGraph?.soil_ph_status && (
          <ChartSection>
            <PhSoilMain filters={filters} />
          </ChartSection>
        )}
        {activeGraph?.soil_conductivity_status && (
          <ChartSection>
            <SoilSalinityConductivityMain filters={filters} />
          </ChartSection>
        )}
        {activeGraph?.soil_moisture_status && (
          <ChartSection>
            <SoilConductivityIrrigationMain filters={filters} />
          </ChartSection>
        )}
        {activeGraph?.npk_status && (
          <ChartSection>
            <NpkMain filters={filters} />
          </ChartSection>
        )}
      </Stack>
    </Box>
  );
};

export default SoilMain;
