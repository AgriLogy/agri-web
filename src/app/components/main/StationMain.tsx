'use client';

import { Box, Stack } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';

import ZoneNotificationBell from '@/app/components/common/ZoneNotificationBell';
import { ChartDateRangeControl } from '@/app/components/layout/ChartDateRangeControl';
import { ChartSection } from '@/app/components/layout/ChartSection';
import { PageInfoBar } from '@/app/components/layout/PageInfoBar';
import { ZoneSelect } from '@/app/components/layout/ZoneSelect';
import { pageSubtitle } from '@/app/components/layout/pageSubtitle';
import { useAnalyticsHeader } from '@/app/components/layout/useAnalyticsHeader';

import CumulPrecipitationMain from '../analytics/CumulPrecipitation/CumulPrecipitationMain';
import ET0Main from '../analytics/ET0/ET0Main';
import PrecipitationRateMain from '../analytics/PrecipitationRate/PrecipitationRateMain';
import SolarRadiationMain from '../analytics/SolarRadiation/SolarRadiationMain';
import TempuratureHumidtyMain from '../analytics/WeatherTempuratureHumidty/TempuratureHumidtyMain';
import VPDMain from '../analytics/VPD/VPDMain';
import WindRadarMain from '../analytics/Wind/WindRadarMain';
import WindSpeedMain from '../analytics/WindSpeed/WindSpeedMain';

const StationMain = () => {
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
        title={t('shell.station.title')}
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
          selectedZone != null ? (
            <ZoneNotificationBell
              zoneId={selectedZone}
              zoneName={zoneName ?? t('shell.common.zoneFallback')}
            />
          ) : null
        }
      />

      <Stack spacing={{ base: 3, md: 4 }} minW={0}>
        {activeGraph?.wind_radar_status && (
          <ChartSection>
            <WindRadarMain filters={filters} />
          </ChartSection>
        )}
        {activeGraph?.weather_temperature_humidity_status && (
          <ChartSection>
            <TempuratureHumidtyMain filters={filters} />
          </ChartSection>
        )}
        {activeGraph?.weather_temperature_humidity_status && (
          <ChartSection>
            <VPDMain filters={filters} />
          </ChartSection>
        )}
        {activeGraph?.et0_status && (
          <ChartSection>
            <ET0Main filters={filters} />
          </ChartSection>
        )}
        {activeGraph?.wind_speed_status && (
          <ChartSection>
            <WindSpeedMain filters={filters} />
          </ChartSection>
        )}
        {activeGraph?.solar_radiation_status && (
          <ChartSection>
            <SolarRadiationMain filters={filters} />
          </ChartSection>
        )}
        {activeGraph?.cumulative_precipitation_status && (
          <ChartSection>
            <CumulPrecipitationMain filters={filters} />
          </ChartSection>
        )}
        {activeGraph?.precipitation_rate_status && (
          <ChartSection>
            <PrecipitationRateMain filters={filters} />
          </ChartSection>
        )}
      </Stack>
    </Box>
  );
};

export default StationMain;
