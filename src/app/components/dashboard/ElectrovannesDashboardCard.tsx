'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  VStack,
  Box,
  useColorModeValue,
  useBreakpointValue,
} from '@chakra-ui/react';
import ElectrovanCard, { Electrovanne } from './ElectrovanCard';
import { electrovanneList } from '@/app/data/dashboard/electrovannes';
import Loading from '../common/Loading';
import DashboardCard from './DashboardCard';

const ElectrovannesList = () => {
  const t = useTranslations();
  const [vannes, setVannes] = useState<Electrovanne[]>([]);
  const tableBg = useColorModeValue('white', 'gray.800');
  const [loading, setLoading] = useState(true);
  const p = useBreakpointValue({ base: 2, md: 4 });

  const fetchVannes = async () => {
    try {
      setVannes(electrovanneList);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch zones:', error);
    }
  };

  const handleVanneClick = (zoneId: number) => {
    console.log(`Redirecting to config page for zone ${zoneId}`);
  };

  useEffect(() => {
    fetchVannes();
  }, [loading]);

  if (loading) {
    return <Loading />;
  }
  const content = (
    <VStack spacing={4} align="stretch">
      {vannes.map((vanne: Electrovanne) => (
        <ElectrovanCard
          key={vanne.id}
          electrovanne={vanne}
          onClick={() => handleVanneClick(vanne.id)}
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
        title={t('shell.dashboard.electrovannesAvailable')}
        content={content}
      />
    </Box>
  );
};

export default ElectrovannesList;
