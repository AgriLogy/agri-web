'use client';

import { Box, SimpleGrid } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';

import { PageInfoBar } from '@/app/components/layout/PageInfoBar';
import ElectrovannesList from './ElectrovannesDashboardCard';
import PompesList from './PompesDashboardCard';
import GoogleMapWeather from '../GoogleMapWeather';
import WeatherDashboard from './WeatherDashboard';
import RecentNotificationsCard from './RecentNotificationsCard';
import SensorGroupsCard from './SensorGroupsCard';

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
  const t = useTranslations();
  return (
    <Box px={{ base: 3, md: 4 }} py={{ base: 3, md: 4 }}>
      <PageInfoBar
        title={t('shell.dashboard.title')}
        subtitle={t('shell.dashboard.subtitle')}
      />
      {/* Sensors, grouped per the account's own groups (#95) — full width so
          the collapsible blocks read as the page's index of sensors. */}
      <Box mb={{ base: 3, md: 4 }}>
        <Card>
          <SensorGroupsCard />
        </Card>
      </Box>
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={{ base: 3, md: 4 }}>
        <Card>
          <GoogleMapWeather />
        </Card>
        <Card>
          <WeatherDashboard />
        </Card>
        <Card>
          <RecentNotificationsCard />
        </Card>
        <Card>
          <ElectrovannesList />
        </Card>
        <Card>
          <PompesList />
        </Card>
      </SimpleGrid>
    </Box>
  );
};

export default MainContent;
