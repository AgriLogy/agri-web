'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Text,
  chakra,
  useToast,
  IconButton,
  HStack,
  Badge,
} from '@chakra-ui/react';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { useTranslations } from 'next-intl';
import {
  getAllSensorsCatalog,
  type SensorCatalogItem,
} from '@/app/utils/sensorCatalog';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import {
  createEmptyGroup,
  loadSensorGroups,
  saveSensorGroups,
  type SensorGroup,
} from '@/app/utils/sensorGroupsStorage';

const SensorGroupsSettings = () => {
  const t = useTranslations();
  const toast = useToast();
  const { textColor, bgColor, borderColor, mutedTextColor } =
    useColorModeStyles();
  const [groups, setGroups] = useState<SensorGroup[]>([]);
  const [newName, setNewName] = useState('');
  const catalog = useMemo(() => getAllSensorsCatalog(true), []);

  useEffect(() => {
    setGroups(loadSensorGroups());
  }, []);

  const persist = (next: SensorGroup[]) => {
    setGroups(next);
    saveSensorGroups(next);
  };

  const addGroup = () => {
    const g = createEmptyGroup(newName);
    persist([...groups, g]);
    setNewName('');
    toast({
      title: t('settings.groups.toastCreated'),
      status: 'success',
      duration: 1500,
    });
  };

  const removeGroup = (id: string) => {
    persist(groups.filter((g) => g.id !== id));
  };

  const renameGroup = (id: string, name: string) => {
    persist(
      groups.map((g) =>
        g.id === id ? { ...g, name: name.trim() || g.name } : g
      )
    );
  };

  const addSensorToGroup = (groupId: string, sensorKey: string) => {
    if (!sensorKey) return;
    persist(
      groups.map((g) => {
        if (g.id !== groupId) return g;
        if (g.sensorKeys.includes(sensorKey)) return g;
        return { ...g, sensorKeys: [...g.sensorKeys, sensorKey] };
      })
    );
  };

  const removeSensorFromGroup = (groupId: string, sensorKey: string) => {
    persist(
      groups.map((g) =>
        g.id === groupId
          ? { ...g, sensorKeys: g.sensorKeys.filter((k) => k !== sensorKey) }
          : g
      )
    );
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

  return (
    <Box>
      <Text fontSize="sm" color={mutedTextColor} mb={3}>
        {t('settings.groups.intro')}
      </Text>
      <Flex gap={2} mb={4} flexWrap="wrap" align="flex-end">
        <FormControl maxW="280px">
          <FormLabel fontSize="sm">
            {t('settings.groups.newNameLabel')}
          </FormLabel>
          <Input
            size="sm"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('settings.groups.newNamePlaceholder')}
          />
        </FormControl>
        <Button
          size="sm"
          leftIcon={<FaPlus />}
          colorScheme="brand"
          onClick={addGroup}
        >
          {t('settings.groups.createButton')}
        </Button>
      </Flex>

      {groups.length === 0 && (
        <Text color={textColor} fontSize="sm">
          {t('settings.groups.emptyGroups')}
        </Text>
      )}

      {groups.map((g) => (
        <Box
          key={g.id}
          borderWidth="1px"
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
              value={g.name}
              onChange={(e) => renameGroup(g.id, e.target.value)}
            />
            <IconButton
              aria-label={t('settings.groups.deleteGroupAria')}
              size="sm"
              icon={<FaTrash />}
              colorScheme="red"
              variant="ghost"
              onClick={() => removeGroup(g.id)}
            />
          </Flex>
          <Text fontSize="xs" color={mutedTextColor} mb={2}>
            {t('settings.groups.sensorsInGroup')}
          </Text>
          <HStack spacing={1} flexWrap="wrap" mb={2}>
            {g.sensorKeys.map((k) => (
              <Badge
                key={k}
                colorScheme="brand"
                cursor="pointer"
                onClick={() => removeSensorFromGroup(g.id, k)}
                title={t('settings.groups.clickToRemove')}
              >
                {k} ×
              </Badge>
            ))}
            {g.sensorKeys.length === 0 && (
              <Text fontSize="sm" color={mutedTextColor}>
                {t('settings.groups.emptySensors')}
              </Text>
            )}
          </HStack>
          <Flex align="center" gap={2} flexWrap="wrap">
            <chakra.select
              key={`${g.id}-${g.sensorKeys.length}`}
              {...selectProps}
              defaultValue=""
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                const v = e.target.value;
                addSensorToGroup(g.id, v);
              }}
            >
              <option value="">{t('settings.groups.addSensorOption')}</option>
              {catalog.map((c: SensorCatalogItem) => (
                <option key={c.key} value={c.key}>
                  {c.readingLabel} ({c.key})
                </option>
              ))}
            </chakra.select>
          </Flex>
        </Box>
      ))}
    </Box>
  );
};

export default SensorGroupsSettings;
