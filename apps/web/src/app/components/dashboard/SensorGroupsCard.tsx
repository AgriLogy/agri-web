'use client';

import { useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Spinner,
  Text,
} from '@chakra-ui/react';
import { FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { useTranslations } from 'next-intl';
import { buildSensorGroupSections } from '@agri/api-client/sensorGroupModel';
import { useSensorGroups } from '@/app/hooks/useSensorGroups';
import useColorModeStyles from '@/app/utils/useColorModeStyles';

/**
 * Dashboard block: the farmer's sensors, grouped.
 *
 * Before agri-web #95 this was one flat list of every sensor. It now renders
 * one collapsible block per account group (persisted server-side, so the same
 * grouping shows up on every device) plus an "Ungrouped" block — sensors in no
 * group stay one click away, and a sensor belonging to two groups appears
 * under both, which the schema explicitly allows.
 */
const SensorGroupsCard = () => {
  const t = useTranslations();
  const { mutedTextColor, borderColor } = useColorModeStyles();
  const { groups, available, loading, error, availability } = useSensorGroups();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const sections = useMemo(
    () => buildSensorGroupSections(groups, available),
    [groups, available]
  );

  const sensorLabel = (key: string) =>
    t.has(`sensors.${key}`) ? t(`sensors.${key}`) : key;

  const sectionKey = (groupId: number | null) =>
    groupId == null ? 'ungrouped' : String(groupId);

  const isOpen = (groupId: number | null) => {
    const key = sectionKey(groupId);
    // Named groups start expanded (they are the point of the screen); the
    // ungrouped remainder starts collapsed so it never buries them.
    return open[key] ?? groupId != null;
  };

  const toggle = (groupId: number | null) =>
    setOpen((prev) => {
      const key = sectionKey(groupId);
      return { ...prev, [key]: !(prev[key] ?? groupId != null) };
    });

  if (loading) {
    return (
      <Flex align="center" gap={2} py={4}>
        <Spinner size="sm" />
        <Text fontSize="sm" color={mutedTextColor}>
          {t('common.loading')}
        </Text>
      </Flex>
    );
  }

  return (
    <Box data-testid="sensor-groups-card">
      <Text fontWeight="bold" mb={1}>
        {t('sensorGroups.title')}
      </Text>
      <Text fontSize="sm" color={mutedTextColor} mb={3}>
        {t('sensorGroups.subtitle')}
      </Text>

      {error && (
        <Alert status="error" borderRadius="md" mb={3}>
          <AlertIcon />
          <AlertDescription fontSize="sm">
            {t('sensorGroups.loadError')}
          </AlertDescription>
        </Alert>
      )}

      {availability === 'unavailable' && (
        <Alert
          status="warning"
          borderRadius="md"
          mb={3}
          alignItems="flex-start"
          data-testid="sensor-groups-unavailable"
        >
          <AlertIcon />
          <Box>
            <AlertTitle fontSize="sm">
              {t('sensorGroups.unavailableTitle')}
            </AlertTitle>
            <AlertDescription fontSize="sm">
              {t('sensorGroups.unavailableBody')}
            </AlertDescription>
          </Box>
        </Alert>
      )}

      {sections.map((section) => {
        const expanded = isOpen(section.groupId);
        const title = section.isUngrouped
          ? t('sensorGroups.ungrouped')
          : (section.name ?? '');
        if (section.isUngrouped && section.sensors.length === 0) return null;
        return (
          <Box
            key={sectionKey(section.groupId)}
            borderWidth="1px"
            borderColor={borderColor}
            borderRadius="md"
            mb={2}
          >
            <Button
              variant="ghost"
              w="100%"
              justifyContent="flex-start"
              onClick={() => toggle(section.groupId)}
              aria-expanded={expanded}
              leftIcon={expanded ? <FaChevronDown /> : <FaChevronRight />}
            >
              <HStack>
                <Text>{title}</Text>
                <Badge colorScheme="brand">
                  {t('sensorGroups.sensorCount', {
                    count: section.sensors.length,
                  })}
                </Badge>
              </HStack>
            </Button>
            {expanded && (
              <Box px={4} pb={3}>
                {section.sensors.length === 0 && (
                  <Text fontSize="sm" color={mutedTextColor}>
                    {t('sensorGroups.emptyGroup')}
                  </Text>
                )}
                {section.sensors.map((sensor) => {
                  const others = sensor.groupNames.filter(
                    (n) => n !== section.name
                  );
                  return (
                    <Flex
                      key={`${sectionKey(section.groupId)}-${sensor.key}`}
                      align="center"
                      gap={2}
                      py={1}
                      flexWrap="wrap"
                    >
                      <Text fontSize="sm">{sensorLabel(sensor.sensorKey)}</Text>
                      {sensor.zoneName && (
                        <Badge colorScheme="gray">{sensor.zoneName}</Badge>
                      )}
                      {others.length > 0 && (
                        <Badge colorScheme="purple">
                          {t('sensorGroups.alsoIn', {
                            groups: others.join(', '),
                          })}
                        </Badge>
                      )}
                      <Text fontSize="xs" color={mutedTextColor}>
                        {sensor.lastReceived
                          ? t('sensorGroups.lastReceived', {
                              when: new Date(
                                sensor.lastReceived
                              ).toLocaleString(),
                            })
                          : t('sensorGroups.never')}
                      </Text>
                    </Flex>
                  );
                })}
              </Box>
            )}
          </Box>
        );
      })}

      {availability !== 'unavailable' &&
        groups.length === 0 &&
        available.length === 0 && (
          <Text fontSize="sm" color={mutedTextColor}>
            {t('sensorGroups.empty')}
          </Text>
        )}
    </Box>
  );
};

export default SensorGroupsCard;
