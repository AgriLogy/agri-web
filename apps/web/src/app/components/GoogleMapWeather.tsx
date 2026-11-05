'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Box,
  Button,
  HStack,
  IconButton,
  Text,
  Tooltip,
  useBreakpointValue,
} from '@chakra-ui/react';
import { Maximize2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Loading from '@component/common/Loading';
import DashboardCard from '@component/dashboard/DashboardCard';
import FarmMapModal from '@component/dashboard/FarmMapModal';
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
  const [expanded, setExpanded] = useState(false);
  const toggleTools = () => setMapToolsOpen((o) => !o);

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
      {/* One Mapbox instance at a time: the card map unmounts while the
          expanded modal is open and remounts (reloading from the server, so
          modal edits show up) when it closes. */}
      {expanded ? (
        <Box
          h={{ base: '360px', md: '480px' }}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Text color="app.text.muted" fontSize="sm">
            {t('misc.googleMapWeather.openInModal')}
          </Text>
        </Box>
      ) : (
        <AgricultureMapboxMap
          lat={DEFAULT_LAT}
          lon={DEFAULT_LON}
          showToolsPanel={mapToolsOpen}
        />
      )}
    </Box>
  );

  // Monitor (read-only) callers get no sector-editing tools, so hide the
  // toggle entirely — an inert button would just be noise (#99). The expand
  // button is for every tier: viewing a bigger map needs no edit rights.
  const titleAddon = (
    <HStack spacing={2}>
      {canEdit ? (
        <Button
          size="sm"
          variant={mapToolsOpen ? 'solid' : 'outline'}
          colorScheme="brand"
          onClick={toggleTools}
        >
          {mapToolsOpen
            ? t('misc.googleMapWeather.hideTools')
            : t('misc.googleMapWeather.showTools')}
        </Button>
      ) : null}
      <Tooltip label={t('misc.googleMapWeather.expand')} hasArrow>
        <IconButton
          size="sm"
          variant="outline"
          aria-label={t('misc.googleMapWeather.expand')}
          icon={<Maximize2 size={16} />}
          onClick={() => setExpanded(true)}
        />
      </Tooltip>
    </HStack>
  );

  return (
    <Box width="100%" height="100%" p={p} overflowX="auto">
      <DashboardCard
        title={t('misc.googleMapWeather.title')}
        titleAddon={titleAddon}
        content={content}
      />
      <FarmMapModal
        isOpen={expanded}
        onClose={() => setExpanded(false)}
        lat={DEFAULT_LAT}
        lon={DEFAULT_LON}
        toolsOpen={mapToolsOpen}
        onToggleTools={toggleTools}
      />
    </Box>
  );
}
