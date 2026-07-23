'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Spinner,
  Text,
  chakra,
  useToast,
} from '@chakra-ui/react';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { useTranslations } from 'next-intl';
import { sensorGroupApi } from '@agri/api-client/sensorGroupApi';
import {
  buildSensorGroupSections,
  isSensorGroupsUnavailableError,
  planLocalGroupImport,
  type AvailableSensor,
} from '@agri/api-client/sensorGroupModel';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import { useSensorGroups } from '@/app/hooks/useSensorGroups';
import {
  loadSensorGroups,
  localGroupsImportHandled,
  markLocalGroupsImportHandled,
} from '@/app/utils/sensorGroupsStorage';

/**
 * Réglages → "Groupes de capteurs".
 *
 * Groups are ACCOUNT data (agri-web #95): everything here goes through
 * `/sensor-groups`, so a group created on a phone is there on the laptop. The
 * old device-local store is read once, to offer a one-time import.
 *
 * A sensor may sit in several groups at once — the picker only hides sensors
 * already in THIS group, and each row shows the other groups it belongs to.
 */
const SensorGroupsSettings = () => {
  const t = useTranslations();
  const toast = useToast();
  const { borderColor, bgColor, mutedTextColor } = useColorModeStyles();
  const {
    groups,
    available,
    loading,
    error,
    availability,
    reload,
    markUnavailable,
  } = useSensorGroups();
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [importOffer, setImportOffer] = useState(false);
  const [nameDrafts, setNameDrafts] = useState<Record<number, string>>({});

  const unavailable = availability === 'unavailable';

  const sensorLabel = useCallback(
    (key: string) => (t.has(`sensors.${key}`) ? t(`sensors.${key}`) : key),
    [t]
  );

  // The legacy device-local groups, offered for a one-time import (never
  // deleted — see sensorGroupsStorage).
  const [localGroups] = useState(() =>
    typeof window === 'undefined' ? [] : loadSensorGroups()
  );
  useEffect(() => {
    if (localGroups.length > 0 && !localGroupsImportHandled()) {
      setImportOffer(true);
    }
  }, [localGroups]);

  const sections = useMemo(
    () =>
      buildSensorGroupSections(groups, available, { includeInactive: true }),
    [groups, available]
  );

  const assignable = useMemo(
    () => available.filter((s) => s.deviceId != null),
    [available]
  );

  const optionLabel = (sensor: AvailableSensor) =>
    `${sensorLabel(sensor.sensorKey)} — ${sensor.zoneName || t('settings.groups.zoneUnknown')}${
      sensor.deviceName ? ` (${sensor.deviceName})` : ''
    }`;

  /** Every write funnels through here so the degraded state is detected once. */
  const run = useCallback(
    async (action: () => Promise<unknown>, successKey: string) => {
      setBusy(true);
      try {
        await action();
        await reload();
        toast({ title: t(successKey), status: 'success', duration: 1500 });
        return true;
      } catch (err) {
        if (isSensorGroupsUnavailableError(err)) {
          // The server told us the migration is missing — stop pretending the
          // farmer merely has no groups yet.
          markUnavailable();
          toast({
            title: t('settings.groups.unavailableTitle'),
            description: t('settings.groups.unavailableBody'),
            status: 'warning',
            duration: 6000,
          });
        } else {
          toast({
            title: t('settings.groups.toastError'),
            status: 'error',
            duration: 3000,
          });
        }
        return false;
      } finally {
        setBusy(false);
      }
    },
    [markUnavailable, reload, t, toast]
  );

  const addGroup = async () => {
    const name = newName.trim();
    if (!name) return;
    const ok = await run(
      () => sensorGroupApi.create({ name }),
      'settings.groups.toastCreated'
    );
    if (ok) setNewName('');
  };

  const renameGroup = (id: number, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    void run(
      () => sensorGroupApi.update(id, { name: trimmed }),
      'settings.groups.toastRenamed'
    );
  };

  const removeGroup = (id: number) =>
    void run(() => sensorGroupApi.remove(id), 'settings.groups.toastDeleted');

  const addSensor = (groupId: number, identity: string) => {
    const sensor = assignable.find((s) => s.key === identity);
    if (!sensor || sensor.deviceId == null) return;
    void run(
      () =>
        sensorGroupApi.addSensor(groupId, {
          device_id: sensor.deviceId as number,
          sensor_key: sensor.sensorKey,
          zone_id: sensor.zoneId,
        }),
      'settings.groups.toastSensorAdded'
    );
  };

  const removeSensor = (groupId: number, membershipId: number) =>
    void run(
      () => sensorGroupApi.removeSensor(groupId, membershipId),
      'settings.groups.toastSensorRemoved'
    );

  /** Move = add to the target then drop from the source, both server-side. */
  const moveSensor = (
    fromGroupId: number,
    membershipId: number,
    toGroupId: number,
    deviceId: number | null,
    sensorKey: string,
    zoneId: number
  ) => {
    if (deviceId == null) return;
    void run(async () => {
      await sensorGroupApi.addSensor(toGroupId, {
        device_id: deviceId,
        sensor_key: sensorKey,
        zone_id: zoneId,
      });
      await sensorGroupApi.removeSensor(fromGroupId, membershipId);
    }, 'settings.groups.toastMoved');
  };

  const runImport = async () => {
    const plan = planLocalGroupImport(localGroups, groups, available);
    setBusy(true);
    let createdGroups = 0;
    let createdSensors = 0;
    try {
      for (const group of plan.groups) {
        const created = await sensorGroupApi.create({ name: group.name });
        createdGroups += 1;
        for (const member of group.members) {
          await sensorGroupApi.addSensor(created.id, {
            device_id: member.deviceId,
            sensor_key: member.sensorKey,
            zone_id: member.zoneId,
          });
          createdSensors += 1;
        }
      }
      markLocalGroupsImportHandled('imported');
      setImportOffer(false);
      await reload();
      toast({
        title: t('settings.groups.importDone', {
          groups: createdGroups,
          sensors: createdSensors,
        }),
        description:
          plan.unresolvedCount > 0
            ? t('settings.groups.importUnresolved', {
                count: plan.unresolvedCount,
              })
            : undefined,
        status: 'success',
        duration: 5000,
      });
    } catch (err) {
      if (isSensorGroupsUnavailableError(err)) markUnavailable();
      toast({
        title: t('settings.groups.importFailed'),
        status: 'error',
        duration: 4000,
      });
    } finally {
      setBusy(false);
    }
  };

  const dismissImport = () => {
    markLocalGroupsImportHandled('dismissed');
    setImportOffer(false);
  };

  const selectProps = {
    rounded: 'md' as const,
    borderWidth: '1px' as const,
    borderColor,
    w: '100%' as const,
    maxW: '320px' as const,
    h: '10' as const,
    px: 3,
    bg: bgColor,
  };

  if (loading) {
    return (
      <Flex align="center" gap={2} py={6}>
        <Spinner size="sm" />
        <Text fontSize="sm" color={mutedTextColor}>
          {t('common.loading')}
        </Text>
      </Flex>
    );
  }

  return (
    <Box>
      <Text fontSize="sm" color={mutedTextColor} mb={3}>
        {t('settings.groups.intro')}
      </Text>

      {error && (
        <Alert status="error" borderRadius="md" mb={3}>
          <AlertIcon />
          <AlertDescription fontSize="sm">
            {t('settings.groups.loadError')}
          </AlertDescription>
          <Button size="xs" ml="auto" onClick={() => void reload()}>
            {t('settings.groups.retry')}
          </Button>
        </Alert>
      )}

      {unavailable && (
        <Alert
          status="warning"
          borderRadius="md"
          mb={3}
          alignItems="flex-start"
          data-testid="groups-unavailable"
        >
          <AlertIcon />
          <Box>
            <AlertTitle fontSize="sm">
              {t('settings.groups.unavailableTitle')}
            </AlertTitle>
            <AlertDescription fontSize="sm">
              {t('settings.groups.unavailableBody')}
            </AlertDescription>
          </Box>
        </Alert>
      )}

      {importOffer && !unavailable && (
        <Alert
          status="info"
          borderRadius="md"
          mb={3}
          alignItems="flex-start"
          data-testid="groups-import-offer"
        >
          <AlertIcon />
          <Box flex="1">
            <AlertTitle fontSize="sm">
              {t('settings.groups.importTitle')}
            </AlertTitle>
            <AlertDescription fontSize="sm" display="block">
              {t('settings.groups.importBody', { count: localGroups.length })}
            </AlertDescription>
            <HStack mt={2}>
              <Button
                size="xs"
                colorScheme="brand"
                isDisabled={busy}
                onClick={() => void runImport()}
              >
                {t('settings.groups.importButton')}
              </Button>
              <Button size="xs" variant="ghost" onClick={dismissImport}>
                {t('settings.groups.importDismiss')}
              </Button>
            </HStack>
          </Box>
        </Alert>
      )}

      <Flex gap={2} mb={4} flexWrap="wrap" align="flex-end">
        <FormControl maxW="280px">
          <FormLabel fontSize="sm">
            {t('settings.groups.newNameLabel')}
          </FormLabel>
          <Input
            size="sm"
            value={newName}
            isDisabled={unavailable || busy}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('settings.groups.newNamePlaceholder')}
          />
        </FormControl>
        <Button
          size="sm"
          leftIcon={<FaPlus />}
          colorScheme="brand"
          isDisabled={unavailable || busy || !newName.trim()}
          onClick={() => void addGroup()}
        >
          {t('settings.groups.createButton')}
        </Button>
      </Flex>

      {!unavailable && groups.length === 0 && (
        <Text fontSize="sm" color={mutedTextColor}>
          {t('settings.groups.emptyGroups')}
        </Text>
      )}

      {sections
        .filter((section) => !section.isUngrouped)
        .map((section) => {
          const groupId = section.groupId as number;
          const inGroup = new Set(section.sensors.map((s) => s.key));
          const pickable = assignable.filter((s) => !inGroup.has(s.key));
          return (
            <Box
              key={groupId}
              borderWidth="1px"
              borderColor={borderColor}
              borderRadius="md"
              p={3}
              mb={3}
              width="100%"
            >
              <Flex
                justify="space-between"
                align="center"
                mb={2}
                flexWrap="wrap"
                gap={2}
              >
                <Input
                  size="sm"
                  maxW="280px"
                  fontWeight="bold"
                  aria-label={t('settings.groups.groupNameAria')}
                  value={nameDrafts[groupId] ?? section.name ?? ''}
                  isDisabled={busy}
                  onChange={(e) =>
                    setNameDrafts((d) => ({ ...d, [groupId]: e.target.value }))
                  }
                  onBlur={(e) => {
                    if (e.target.value.trim() === (section.name ?? '')) return;
                    renameGroup(groupId, e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                  }}
                />
                <IconButton
                  aria-label={t('settings.groups.deleteGroupAria')}
                  size="sm"
                  icon={<FaTrash />}
                  colorScheme="red"
                  variant="ghost"
                  isDisabled={busy}
                  onClick={() => removeGroup(groupId)}
                />
              </Flex>

              <Text fontSize="xs" color={mutedTextColor} mb={2}>
                {t('settings.groups.sensorsInGroup')}
              </Text>

              {section.sensors.length === 0 && (
                <Text fontSize="sm" color={mutedTextColor} mb={2}>
                  {t('settings.groups.emptySensors')}
                </Text>
              )}

              {section.sensors.map((sensor) => {
                const others = sensor.groupNames.filter(
                  (n) => n !== section.name
                );
                return (
                  <Flex
                    key={sensor.membershipId ?? sensor.key}
                    align="center"
                    gap={2}
                    mb={2}
                    flexWrap="wrap"
                  >
                    <Text fontSize="sm">{sensorLabel(sensor.sensorKey)}</Text>
                    <Badge colorScheme="gray">
                      {sensor.zoneName || t('settings.groups.zoneUnknown')}
                    </Badge>
                    {others.length > 0 && (
                      <Badge colorScheme="purple">
                        {t('settings.groups.alsoIn', {
                          groups: others.join(', '),
                        })}
                      </Badge>
                    )}
                    <chakra.select
                      {...selectProps}
                      maxW="200px"
                      h="8"
                      fontSize="sm"
                      aria-label={t('settings.groups.moveAria')}
                      value=""
                      disabled={busy}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        const target = Number(e.target.value);
                        if (!target || sensor.membershipId == null) return;
                        moveSensor(
                          groupId,
                          sensor.membershipId,
                          target,
                          sensor.deviceId,
                          sensor.sensorKey,
                          sensor.zoneId
                        );
                      }}
                    >
                      <option value="">
                        {t('settings.groups.moveToOption')}
                      </option>
                      {groups
                        .filter((g) => g.id !== groupId)
                        .map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                    </chakra.select>
                    <IconButton
                      aria-label={t('settings.groups.removeSensorAria')}
                      size="xs"
                      variant="ghost"
                      colorScheme="red"
                      icon={<FaTrash />}
                      isDisabled={busy}
                      onClick={() =>
                        sensor.membershipId != null &&
                        removeSensor(groupId, sensor.membershipId)
                      }
                    />
                  </Flex>
                );
              })}

              <Flex align="center" gap={2} flexWrap="wrap">
                <chakra.select
                  key={`${groupId}-${section.sensors.length}`}
                  {...selectProps}
                  aria-label={t('settings.groups.addSensorOption')}
                  defaultValue=""
                  disabled={busy || pickable.length === 0}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    if (e.target.value) addSensor(groupId, e.target.value);
                  }}
                >
                  <option value="">
                    {t('settings.groups.addSensorOption')}
                  </option>
                  {pickable.map((sensor) => (
                    <option key={sensor.key} value={sensor.key}>
                      {optionLabel(sensor)}
                    </option>
                  ))}
                </chakra.select>
                {assignable.length === 0 && (
                  <Text fontSize="xs" color={mutedTextColor}>
                    {t('settings.groups.noAssignableSensors')}
                  </Text>
                )}
              </Flex>
            </Box>
          );
        })}
    </Box>
  );
};

export default SensorGroupsSettings;
