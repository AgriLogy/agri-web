'use client';

import { Box, SimpleGrid } from '@chakra-ui/react';

import { PageInfoBar } from '@/app/components/layout/PageInfoBar';
import ElectrovannesList from './ElectrovannesDashboardCard';
import GoogleMapWeather from '../GoogleMapWeather';
import WeatherDashboard from './WeatherDashboard';
import Zones from './ZonesDashboardCard';

const Card = ({ children }: { children: React.ReactNode }) => (
  <Box
    bg="app.surface"
    borderWidth="1px"
    borderColor="app.border"
    borderRadius="lg"
    minH="280px"
    p={{ base: 3, md: 4 }}
    display="flex"
    flexDirection="column"
  >
    <Box flex="1" minW={0} minH={0} w="100%">
      {children}
    </Box>
  </Box>
);

const MainContent = () => {
  return (
    <Box px={{ base: 3, md: 4 }} py={{ base: 3, md: 4 }}>
      <PageInfoBar
        title="Tableau de bord"
        subtitle="Vue d'ensemble de la ferme — météo, zones, et état du réseau d'irrigation"
      />
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={{ base: 3, md: 4 }}>
        <Card>
          <GoogleMapWeather />
        </Card>
        <Card>
          <WeatherDashboard />
        </Card>
        <Card>
          <Zones />
        </Card>
        <Card>
          <ElectrovannesList />
        </Card>
      </SimpleGrid>
    </Box>
  );
};

export default MainContent;
