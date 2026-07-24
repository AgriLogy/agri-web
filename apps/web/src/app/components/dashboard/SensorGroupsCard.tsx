'use client';

import { useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Badge,
  Box,
  Circle,
  Flex,
  HStack,
  SimpleGrid,
  Spacer,
  Spinner,
  Text,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react';
import { FaChevronDown, FaChevronRight, FaBolt, FaLeaf } from 'react-icons/fa';
import { FaWater, FaMicrochip } from 'react-icons/fa6';
import { GiChemicalDrop, GiWaterDrop, GiFruitBowl } from 'react-icons/gi';
import {
  WiThermometer,
  WiHumidity,
  WiBarometer,
  WiStrongWind,
  WiRain,
  WiDaySunny,
} from 'react-icons/wi';
import { useLocale, useTranslations } from 'next-intl';
import { buildSensorGroupSections } from '@agri/api-client/sensorGroupModel';
import { useSensorGroups } from '@/app/hooks/useSensorGroups';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import {
  sensorCategory,
  categoryColorScheme,
  freshness,
  relativeReceived,
  exactReceived,
  humanizeSensorKey,
  type Freshness,
} from './sensorTilePresentation';

type IconCmp = ComponentType<{ size?: number }>;

/** Finer per-key icon (colour still comes from the category), for a varied grid. */
function iconFor(sensorKey: string): IconCmp {
  const k = sensorKey.toLowerCase();
  if (k.includes('wind')) return WiStrongWind;
  if (k.includes('solar')) return WiDaySunny;
  if (k.includes('precipitation')) return WiRain;
  if (k.includes('humidity')) return WiHumidity;
  if (k.includes('pressure') || k === 'vpd' || k.startsWith('et0'))
    return WiBarometer;
  if (k.includes('temperature')) return WiThermometer;
  if (k.includes('flow') || k.includes('level') || k.includes('water'))
    return FaWater;
  if (k.includes('ph')) return GiChemicalDrop;
  if (k.startsWith('ec_') || k.includes('conductiv') || k.includes('salinity'))
    return FaBolt;
  if (k.includes('electric') || k.includes('consumption')) return FaBolt;
  if (k.includes('leaf')) return FaLeaf;
  if (k.includes('fruit') || k.includes('diameter')) return GiFruitBowl;
  if (k.includes('moisture') || k.includes('soil')) return GiWaterDrop;
  return FaMicrochip;
}

const CATEGORY_ORDER = ['soil', 'water', 'weather', 'plant', 'power', 'other'];

/**
 * Dashboard block: the farmer's sensors, grouped (agri-web #95, redesigned in
 * #127). One collapsible block per account group plus an "Ungrouped" bucket;
 * inside each, a responsive grid of sensor tiles — category icon + colour, a
 * freshness status dot, and the localised time of the newest reading. A sensor
 * in several groups appears under each, which the schema allows.
 */
const SensorGroupsCard = () => {
  const t = useTranslations();
  const locale = useLocale();
  const { mutedTextColor, borderColor } = useColorModeStyles();
  const { groups, available, loading, error, availability } = useSensorGroups();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const tileBorder = useColorModeValue('gray.200', 'whiteAlpha.200');
  const tileHoverBg = useColorModeValue('gray.50', 'whiteAlpha.100');
  const headerHoverBg = useColorModeValue('blackAlpha.50', 'whiteAlpha.100');

  // Per-scheme colours precomputed once (hooks must not run inside the map).
  const schemeIcon: Record<string, string> = {
    green: useColorModeValue('green.500', 'green.300'),
    blue: useColorModeValue('blue.500', 'blue.300'),
    orange: useColorModeValue('orange.500', 'orange.300'),
    purple: useColorModeValue('purple.500', 'purple.300'),
    yellow: useColorModeValue('yellow.600', 'yellow.300'),
    gray: useColorModeValue('gray.500', 'gray.300'),
  };
  const schemeTint: Record<string, string> = {
    green: useColorModeValue('green.50', 'green.900'),
    blue: useColorModeValue('blue.50', 'blue.900'),
    orange: useColorModeValue('orange.50', 'orange.900'),
    purple: useColorModeValue('purple.50', 'purple.900'),
    yellow: useColorModeValue('yellow.50', 'yellow.900'),
    gray: useColorModeValue('gray.100', 'whiteAlpha.200'),
  };
  const dotColor: Record<Freshness, string> = {
    fresh: 'green.400',
    recent: 'yellow.400',
    stale: useColorModeValue('gray.300', 'gray.500'),
    never: useColorModeValue('gray.200', 'gray.600'),
  };

  const sections = useMemo(
    () => buildSensorGroupSections(groups, available),
    [groups, available]
  );

  // Captured once on mount (impure Date.now() is fine in a useState
  // initializer) — the relative "last received" labels need not tick live.
  const [now] = useState(() => Date.now());

  const sensorLabel = (key: string) =>
    t.has(`sensors.${key}`) ? t(`sensors.${key}`) : humanizeSensorKey(key);

  const freshnessLabel = (f: Freshness) =>
    t.has(`sensorGroups.freshness.${f}`) ? t(`sensorGroups.freshness.${f}`) : f;

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

        const sensors = [...section.sensors].sort((a, b) => {
          const ca = CATEGORY_ORDER.indexOf(sensorCategory(a.sensorKey));
          const cb = CATEGORY_ORDER.indexOf(sensorCategory(b.sensorKey));
          if (ca !== cb) return ca - cb;
          return sensorLabel(a.sensorKey).localeCompare(
            sensorLabel(b.sensorKey)
          );
        });
        const zones = Array.from(
          new Set(sensors.map((s) => s.zoneName).filter(Boolean))
        );
        const singleZone = zones.length === 1 ? zones[0] : null;

        return (
          <Box
            key={sectionKey(section.groupId)}
            borderWidth="1px"
            borderColor={borderColor}
            borderRadius="lg"
            mb={2}
            overflow="hidden"
          >
            <Flex
              as="button"
              type="button"
              w="100%"
              align="center"
              gap={2}
              px={3}
              py={2.5}
              onClick={() => toggle(section.groupId)}
              aria-expanded={expanded}
              transition="background 0.15s ease"
              _hover={{ bg: headerHoverBg }}
            >
              <Box color={mutedTextColor} fontSize="xs">
                {expanded ? <FaChevronDown /> : <FaChevronRight />}
              </Box>
              <Text fontWeight="semibold" noOfLines={1}>
                {title}
              </Text>
              <Badge colorScheme="brand" borderRadius="full" px={2}>
                {t('sensorGroups.sensorCount', { count: sensors.length })}
              </Badge>
              {singleZone && (
                <Badge
                  colorScheme="gray"
                  variant="subtle"
                  borderRadius="full"
                  px={2}
                  fontWeight="normal"
                  textTransform="none"
                >
                  {singleZone}
                </Badge>
              )}
              <Spacer />
            </Flex>

            {expanded && (
              <Box px={3} pb={3} pt={1}>
                {sensors.length === 0 ? (
                  <Text fontSize="sm" color={mutedTextColor}>
                    {t('sensorGroups.emptyGroup')}
                  </Text>
                ) : (
                  <SimpleGrid columns={{ base: 1, sm: 2, xl: 3 }} spacing={2}>
                    {sensors.map((sensor) => {
                      const scheme = categoryColorScheme(
                        sensorCategory(sensor.sensorKey)
                      );
                      const Icon = iconFor(sensor.sensorKey);
                      const fresh = freshness(sensor.lastReceived, now);
                      const rel = relativeReceived(
                        sensor.lastReceived,
                        now,
                        locale
                      );
                      const exact = exactReceived(sensor.lastReceived, locale);
                      const others = sensor.groupNames.filter(
                        (n) => n !== section.name
                      );
                      const tipWhen = exact
                        ? t('sensorGroups.lastReceived', { when: exact })
                        : t('sensorGroups.never');
                      const tipAlso =
                        others.length > 0
                          ? ` · ${t('sensorGroups.alsoIn', { groups: others.join(', ') })}`
                          : '';

                      return (
                        <Tooltip
                          key={`${sectionKey(section.groupId)}-${sensor.key}`}
                          label={`${sensorLabel(sensor.sensorKey)} — ${tipWhen} · ${freshnessLabel(fresh)}${tipAlso}`}
                          placement="top"
                          hasArrow
                          openDelay={300}
                        >
                          <Flex
                            align="center"
                            gap={3}
                            p={2.5}
                            borderWidth="1px"
                            borderColor={tileBorder}
                            borderRadius="md"
                            transition="background 0.15s ease"
                            _hover={{ bg: tileHoverBg }}
                          >
                            <Circle
                              size="34px"
                              bg={schemeTint[scheme]}
                              color={schemeIcon[scheme]}
                              flexShrink={0}
                            >
                              <Icon size={17} />
                            </Circle>
                            <Box minW={0} flex="1">
                              <Text
                                fontSize="sm"
                                fontWeight="medium"
                                noOfLines={1}
                              >
                                {sensorLabel(sensor.sensorKey)}
                              </Text>
                              <HStack
                                spacing={1}
                                fontSize="xs"
                                color={mutedTextColor}
                              >
                                {!singleZone && sensor.zoneName && (
                                  <>
                                    <Text noOfLines={1}>{sensor.zoneName}</Text>
                                    <Text>·</Text>
                                  </>
                                )}
                                <Text noOfLines={1}>
                                  {rel ?? t('sensorGroups.never')}
                                </Text>
                                {others.length > 0 && (
                                  <Badge
                                    colorScheme="purple"
                                    variant="subtle"
                                    fontSize="0.6rem"
                                    textTransform="none"
                                  >
                                    {t('sensorGroups.alsoInShort', {
                                      count: others.length,
                                    })}
                                  </Badge>
                                )}
                              </HStack>
                            </Box>
                            <Circle
                              size="9px"
                              bg={dotColor[fresh]}
                              flexShrink={0}
                            />
                          </Flex>
                        </Tooltip>
                      );
                    })}
                  </SimpleGrid>
                )}
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
