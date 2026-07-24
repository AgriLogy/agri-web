'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Box, Button, useBreakpointValue } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import Loading from '@component/common/Loading';
import DashboardCard from '@component/dashboard/DashboardCard';
import { useCan } from '@/app/hooks/useAccessLevel';

const AgricultureMapboxMap = dynamic(
  () => import('@component/map/AgricultureMapboxMap'),
  {
    ssr: false,
    loading: () => <Loading />,
  }
);

const DEFAULT_LAT = 32.88986;
const DEFAULT_LON = -6.914351;

export default function GoogleMapWeather() {
  const t = useTranslations();
  const { canEdit } = useCan();
  const p = useBreakpointValue({ base: 2, md: 4 }) ?? 2;
  const [mapToolsOpen, setMapToolsOpen] = useState(false);

  const content = (
    <Box
      maxW="100%"
      maxH={{ base: 'none', md: '560px' }}
      minH={{ base: '360px', md: '480px' }}
      height="100%"
      width="100%"
      borderRadius="md"
      overflow="hidden"
      position="relative"
    >
      <AgricultureMapboxMap
        lat={DEFAULT_LAT}
        lon={DEFAULT_LON}
        showToolsPanel={mapToolsOpen}
      />
    </Box>
  );

  // Monitor (read-only) callers get no sector-editing tools, so hide the
  // toggle entirely — an inert button would just be noise (#99).
  const titleAddon = canEdit ? (
    <Button
      size="sm"
      variant={mapToolsOpen ? 'solid' : 'outline'}
      colorScheme="brand"
      onClick={() => setMapToolsOpen((o) => !o)}
    >
      {mapToolsOpen
        ? t('misc.googleMapWeather.hideTools')
        : t('misc.googleMapWeather.showTools')}
    </Button>
  ) : undefined;

  return (
    <Box width="100%" height="100%" p={p} overflowX="auto">
      <DashboardCard
        title={t('misc.googleMapWeather.title')}
        titleAddon={titleAddon}
        content={content}
      />
    </Box>
  );
}
