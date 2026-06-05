'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  VStack,
  Box,
  useColorModeValue,
  useBreakpointValue,
} from '@chakra-ui/react';
import ZoneCard from '../admin/ZoneCard';
import { zonesLst } from '@/app/data/dashboard/zones';
import DashboardCard from '@component/dashboard/DashboardCard';
import { ZoneType } from '@/app/types';
import Loading from '@component/common/Loading';

const ZonesDashboardCard = () => {
  const t = useTranslations();
  const [zones, setZones] = useState<ZoneType[]>([]);
  const [loading, setLoading] = useState(true);
  const tableBg = useColorModeValue('white', 'gray.800');
  const p = useBreakpointValue({ base: 2, md: 4 });

  const fetchZones = async () => {
    try {
      setZones(zonesLst);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch zones:', error);
    }
  };
  const handleZoneClick = (zoneId: number) => {
    console.log(`Redirecting to config page for zone ${zoneId}`);
  };

  useEffect(() => {
    fetchZones();
  }, [loading]);

  if (loading) {
    return <Loading />;
  }
  const content = (
    <VStack spacing={4} align="stretch">
      {zones.map((zone) => (
        <ZoneCard
          key={zone.id}
          zone={zone}
          onClick={() => handleZoneClick(zone.id)}
        />
      ))}
    </VStack>
  );

  return (
    <Box
      width="100%"
      height="100%"
      bg={tableBg}
      borderRadius="md"
      p={p}
      overflowX="auto"
    >
      <DashboardCard
        title={t('shell.dashboard.zonesAvailable')}
        content={content}
      />
    </Box>
  );
};

export default ZonesDashboardCard;
