'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  VStack,
  Box,
  Text,
  useColorModeValue,
  useBreakpointValue,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import PumpCard from './PumpCard';
import DashboardCard from './DashboardCard';
import Loading from '../common/Loading';
import {
  loadVannesPompesFromStorage,
  VANNES_POMPES_UPDATED_EVENT,
  type Pump,
} from '@/app/utils/vannesPompesStorage';

const PompesList = () => {
  const t = useTranslations();
  const router = useRouter();
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [loading, setLoading] = useState(true);
  const tableBg = useColorModeValue('white', 'gray.800');
  const p = useBreakpointValue({ base: 2, md: 4 });

  useEffect(() => {
    const refresh = () => {
      setPumps(loadVannesPompesFromStorage().pumps);
      setLoading(false);
    };
    refresh();
    window.addEventListener(VANNES_POMPES_UPDATED_EVENT, refresh);
    return () =>
      window.removeEventListener(VANNES_POMPES_UPDATED_EVENT, refresh);
  }, []);

  if (loading) {
    return <Loading />;
  }

  const content =
    pumps.length === 0 ? (
      <Text fontSize="sm" color="app.text.muted">
        {t('shell.dashboard.pompesEmpty')}
      </Text>
    ) : (
      <VStack spacing={4} align="stretch">
        {pumps.map((pump) => (
          <PumpCard
            key={pump.id}
            pump={pump}
            onClick={() => router.push('/vannes-pompes')}
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
        title={t('shell.dashboard.pompesAvailable')}
        content={content}
      />
    </Box>
  );
};

export default PompesList;
