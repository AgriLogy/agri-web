'use client';

import React from 'react';
import { Box, Button, HStack } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';

import { PageInfoBar } from '@/app/components/layout/PageInfoBar';
import { useCan } from '@/app/hooks/useAccessLevel';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import ProfileSection from '@/app/components/settings/ProfileSection';
import DefaultContactSection from '@/app/components/settings/DefaultContactSection';
import TechniciansSection from '@/app/components/settings/TechniciansSection';
import FarmSettingsSection from '@/app/components/settings/FarmSettingsSection';
import SensorDirectorySettings from '@/app/components/settings/SensorDirectorySettings';
import SensorCalibrationSettings from '@/app/components/settings/SensorCalibrationSettings';
import SensorGroupsSettings from '@/app/components/settings/SensorGroupsSettings';
import SensorReadingsSettings from '@/app/components/settings/SensorReadingsSettings';
import SuperAdminUsersSettings from '@/app/components/settings/SuperAdminUsersSettings';

type SettingsTab =
  | 'profile'
  | 'farms'
  | 'contact'
  | 'technicians'
  | 'users'
  | 'sensors'
  | 'readings'
  | 'calibration'
  | 'groups';

const TAB_KEYS: SettingsTab[] = [
  'profile',
  'farms',
  'contact',
  'technicians',
  'users',
  'sensors',
  'readings',
  'calibration',
  'groups',
];

const TAB_LABEL_KEY: Record<SettingsTab, string> = {
  profile: 'settings.main.tabProfile',
  farms: 'settings.main.tabFarms',
  contact: 'settings.main.tabContact',
  technicians: 'settings.main.tabTechnicians',
  users: 'settings.main.tabUsers',
  sensors: 'settings.main.tabSensors',
  readings: 'settings.main.tabReadings',
  calibration: 'settings.main.tabCalibration',
  groups: 'settings.main.tabGroups',
};

const SettingsMain = () => {
  const t = useTranslations();
  const { tabAccent, iconColor } = useColorModeStyles();
  const { canManageUsers } = useCan();
  const [activeTab, setActiveTab] = React.useState<SettingsTab>('readings');

  // The "Users" tab is the super-admin account manager: GET /users is
  // admin-only server-side (403 "Admin access required"), so a normal user
  // only ever saw its "Access denied" error. Hide the tab unless the caller
  // may manage users — technicians (below) remain available to every owner.
  const tabKeys = TAB_KEYS.filter((key) => key !== 'users' || canManageUsers);
  const visibleTab = tabKeys.includes(activeTab) ? activeTab : 'readings';
  const activeLabel = t(TAB_LABEL_KEY[visibleTab]);

  return (
    <Box px={{ base: 3, md: 4 }} py={{ base: 3, md: 4 }}>
      <PageInfoBar title={t('settings.main.title')} subtitle={activeLabel} />

      {/* Full-width tab strip: scrolls horizontally on narrow screens instead
          of cramming/overlapping the labels in the info-bar (mobile fix). */}
      <Box
        overflowX="auto"
        overflowY="hidden"
        mb={{ base: 3, md: 4 }}
        sx={{
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          '::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <HStack spacing={{ base: 1, md: 2 }} minW="max-content">
          {tabKeys.map((tabKey) => {
            const isActive = tabKey === visibleTab;
            return (
              <Button
                key={tabKey}
                onClick={() => setActiveTab(tabKey)}
                variant="ghost"
                size="sm"
                flexShrink={0}
                color={isActive ? tabAccent : iconColor}
                borderBottomWidth="2px"
                borderBottomColor={isActive ? tabAccent : 'transparent'}
                borderRadius="0"
                textTransform="uppercase"
                fontSize="xs"
                fontWeight="700"
                letterSpacing="0.3px"
                _hover={{ color: tabAccent }}
              >
                {t(TAB_LABEL_KEY[tabKey])}
              </Button>
            );
          })}
        </HStack>
      </Box>

      <Box
        bg="app.surface"
        borderWidth="1px"
        borderColor="app.border"
        borderRadius="lg"
        px={{ base: 3, md: 4 }}
        py={{ base: 3, md: 4 }}
        minW={0}
      >
        {visibleTab === 'profile' && <ProfileSection />}
        {visibleTab === 'readings' && <SensorReadingsSettings />}
        {visibleTab === 'farms' && <FarmSettingsSection />}
        {visibleTab === 'contact' && <DefaultContactSection />}
        {visibleTab === 'technicians' && <TechniciansSection />}
        {visibleTab === 'users' && <SuperAdminUsersSettings />}
        {visibleTab === 'sensors' && <SensorDirectorySettings />}
        {visibleTab === 'calibration' && <SensorCalibrationSettings />}
        {visibleTab === 'groups' && <SensorGroupsSettings />}
      </Box>
    </Box>
  );
};

export default SettingsMain;
