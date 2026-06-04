'use client';

import React from 'react';
import { Box, Button, HStack } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';

import { PageInfoBar } from '@/app/components/layout/PageInfoBar';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import FarmSettingsSection from '@/app/components/settings/FarmSettingsSection';
import SensorDirectorySettings from '@/app/components/settings/SensorDirectorySettings';
import SensorGroupsSettings from '@/app/components/settings/SensorGroupsSettings';
import SensorReadingsSettings from '@/app/components/settings/SensorReadingsSettings';
import SuperAdminUsersSettings from '@/app/components/settings/SuperAdminUsersSettings';

type SettingsTab = 'farms' | 'users' | 'sensors' | 'readings' | 'groups';

const TAB_KEYS: SettingsTab[] = [
  'farms',
  'users',
  'sensors',
  'readings',
  'groups',
];

const TAB_LABEL_KEY: Record<SettingsTab, string> = {
  farms: 'settings.main.tabFarms',
  users: 'settings.main.tabUsers',
  sensors: 'settings.main.tabSensors',
  readings: 'settings.main.tabReadings',
  groups: 'settings.main.tabGroups',
};

const SettingsMain = () => {
  const t = useTranslations();
  const { tabAccent, iconColor } = useColorModeStyles();
  const [activeTab, setActiveTab] = React.useState<SettingsTab>('readings');
  const activeLabel = t(TAB_LABEL_KEY[activeTab]);

  return (
    <Box px={{ base: 3, md: 4 }} py={{ base: 3, md: 4 }}>
      <PageInfoBar
        title={t('settings.main.title')}
        subtitle={activeLabel}
        actions={
          <HStack
            spacing={{ base: 1, md: 2 }}
            overflowX="auto"
            whiteSpace="nowrap"
          >
            {TAB_KEYS.map((tabKey) => {
              const isActive = tabKey === activeTab;
              return (
                <Button
                  key={tabKey}
                  onClick={() => setActiveTab(tabKey)}
                  variant="ghost"
                  size="sm"
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
        }
      />

      <Box
        bg="app.surface"
        borderWidth="1px"
        borderColor="app.border"
        borderRadius="lg"
        px={{ base: 3, md: 4 }}
        py={{ base: 3, md: 4 }}
        minW={0}
      >
        {activeTab === 'readings' && <SensorReadingsSettings />}
        {activeTab === 'farms' && <FarmSettingsSection />}
        {activeTab === 'users' && <SuperAdminUsersSettings />}
        {activeTab === 'sensors' && <SensorDirectorySettings />}
        {activeTab === 'groups' && <SensorGroupsSettings />}
      </Box>
    </Box>
  );
};

export default SettingsMain;
