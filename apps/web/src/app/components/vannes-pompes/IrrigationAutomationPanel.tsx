'use client';

/**
 * Real backend-driven irrigation control: manual Open/Close per zone, scheduled
 * programs, and command history — backed by agri-api `/irrigation`. Physical
 * dispatch is simulated by default (a banner makes this explicit) until the
 * downlink backend is wired + hardware-tested.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  IconButton,
  Input,
  Select,
  Switch,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { MdDelete, MdLockOpen, MdLock } from 'react-icons/md';
import { useTranslations } from 'next-intl';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import { useCan } from '@/app/hooks/useAccessLevel';
import { PermissionGate } from '@/app/components/common/PermissionGate';
import {
  irrigationAutomationApi as apiClient,
  type IrrigationProgram,
  type OutputCommand,
  type ZoneOption,
} from '@agri/api-client/irrigationAutomationApi';

const STATUS_COLOR: Record<string, string> = {
  simulated: 'blue',
  sent: 'green',
  failed: 'red',
  pending: 'gray',
};

const IrrigationAutomationPanel = () => {
  const t = useTranslations();
  const toast = useToast();
  const { bg, textColor, borderColor } = useColorModeStyles();
  const { canEdit, canDelete } = useCan();

  const [dispatchEnabled, setDispatchEnabled] = useState(false);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [programs, setPrograms] = useState<IrrigationProgram[]>([]);
  const [commands, setCommands] = useState<OutputCommand[]>([]);
  const [busyZone, setBusyZone] = useState<number | null>(null);

  // New-program form.
  const [pName, setPName] = useState('');
  const [pZone, setPZone] = useState<number | ''>('');
  const [pTime, setPTime] = useState('06:00');
  const [pDuration, setPDuration] = useState('');

  const zoneName = useCallback(
    (id: number) => zones.find((z) => z.id === id)?.name ?? `#${id}`,
    [zones]
  );

  const refreshCommands = useCallback(async () => {
    try {
      setCommands(await apiClient.listCommands());
    } catch {
      /* best-effort */
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [cfg, zs, ps, cs] = await Promise.all([
          apiClient.getConfig(),
          apiClient.listZones(),
          apiClient.listPrograms(),
          apiClient.listCommands(),
        ]);
        setDispatchEnabled(cfg.dispatch_enabled);
        setZones(zs);
        setPrograms(ps);
        setCommands(cs);
      } catch {
        /* best-effort; the page still renders the schematic below */
      }
    })();
  }, []);

  const sendCommand = async (zoneId: number, action: 'open' | 'close') => {
    setBusyZone(zoneId);
    try {
      const cmd = await apiClient.sendCommand(zoneId, action);
      toast({
        status: cmd.status === 'failed' ? 'error' : 'success',
        title: t(`irrigationAutomation.commandSent.${action}`),
        description: t(`irrigationAutomation.status.${cmd.status}`),
        duration: 3000,
      });
      await refreshCommands();
    } catch {
      toast({ status: 'error', title: t('irrigationAutomation.commandError') });
    } finally {
      setBusyZone(null);
    }
  };

  const addProgram = async () => {
    if (!pName.trim() || pZone === '') return;
    try {
      const created = await apiClient.createProgram({
        name: pName.trim(),
        zone_id: Number(pZone),
        start_time: `${pTime}:00`,
        duration_min: pDuration ? Number(pDuration) : null,
      });
      setPrograms((prev) => [...prev, created]);
      setPName('');
      setPZone('');
      setPDuration('');
    } catch {
      toast({ status: 'error', title: t('irrigationAutomation.programError') });
    }
  };

  const toggleProgram = async (p: IrrigationProgram) => {
    try {
      const updated = await apiClient.updateProgram(p.id, {
        name: p.name,
        zone_id: p.zone_id,
        start_time: p.start_time,
        weekdays: p.weekdays,
        enabled: !p.enabled,
        duration_min: p.duration_min,
        target_volume_m3: p.target_volume_m3,
      });
      setPrograms((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
    } catch {
      toast({ status: 'error', title: t('irrigationAutomation.programError') });
    }
  };

  const removeProgram = async (id: number) => {
    try {
      await apiClient.deleteProgram(id);
      setPrograms((prev) => prev.filter((x) => x.id !== id));
    } catch {
      toast({ status: 'error', title: t('irrigationAutomation.programError') });
    }
  };

  const card = {
    bg,
    color: textColor,
    borderWidth: '1px',
    borderColor,
    borderRadius: 'lg',
    p: 4,
  };

  return (
    <VStack align="stretch" spacing={4} mb={6}>
      {!dispatchEnabled && (
        <Box
          borderWidth="1px"
          borderColor="orange.300"
          bg="orange.50"
          color="orange.800"
          borderRadius="lg"
          px={4}
          py={3}
          _dark={{ bg: 'orange.900', color: 'orange.100' }}
        >
          <Text fontSize="sm" fontWeight={600}>
            {t('irrigationAutomation.simBannerTitle')}
          </Text>
          <Text fontSize="xs">{t('irrigationAutomation.simBannerBody')}</Text>
        </Box>
      )}

      {/* Manual control per zone */}
      <Box {...card}>
        <Heading size="sm" mb={3}>
          {t('irrigationAutomation.manualTitle')}
        </Heading>
        {zones.length === 0 ? (
          <Text fontSize="sm" opacity={0.7}>
            {t('irrigationAutomation.noZones')}
          </Text>
        ) : (
          <VStack align="stretch" spacing={2}>
            {zones.map((z) => (
              <Flex
                key={z.id}
                align="center"
                justify="space-between"
                borderWidth="1px"
                borderColor={borderColor}
                borderRadius="md"
                px={3}
                py={2}
              >
                <Text fontWeight={600}>{z.name}</Text>
                <HStack>
                  <PermissionGate
                    blocked={!canEdit}
                    reason={t('access.editRequiresEditor')}
                    ui="chakra"
                  >
                    <Button
                      size="sm"
                      colorScheme="green"
                      leftIcon={<MdLockOpen />}
                      isLoading={busyZone === z.id}
                      onClick={() => sendCommand(z.id, 'open')}
                    >
                      {t('irrigationAutomation.open')}
                    </Button>
                  </PermissionGate>
                  <PermissionGate
                    blocked={!canEdit}
                    reason={t('access.editRequiresEditor')}
                    ui="chakra"
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<MdLock />}
                      isLoading={busyZone === z.id}
                      onClick={() => sendCommand(z.id, 'close')}
                    >
                      {t('irrigationAutomation.close')}
                    </Button>
                  </PermissionGate>
                </HStack>
              </Flex>
            ))}
          </VStack>
        )}
      </Box>

      {/* Programs */}
      <Box {...card}>
        <Heading size="sm" mb={3}>
          {t('irrigationAutomation.programsTitle')}
        </Heading>
        <VStack align="stretch" spacing={2} mb={3}>
          {programs.map((p) => (
            <Flex
              key={p.id}
              align="center"
              justify="space-between"
              borderWidth="1px"
              borderColor={borderColor}
              borderRadius="md"
              px={3}
              py={2}
            >
              <Box>
                <Text fontWeight={600}>{p.name}</Text>
                <Text fontSize="xs" opacity={0.7}>
                  {zoneName(p.zone_id)} · {p.start_time.slice(0, 5)}
                  {p.duration_min ? ` · ${p.duration_min} min` : ''}
                </Text>
              </Box>
              <HStack>
                <Switch
                  isChecked={p.enabled}
                  isDisabled={!canEdit}
                  onChange={() => toggleProgram(p)}
                  colorScheme="green"
                />
                <PermissionGate
                  blocked={!canDelete}
                  reason={t('access.deleteRequiresAdmin')}
                  ui="chakra"
                >
                  <IconButton
                    aria-label={t('irrigationAutomation.deleteProgram')}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    icon={<MdDelete />}
                    onClick={() => removeProgram(p.id)}
                  />
                </PermissionGate>
              </HStack>
            </Flex>
          ))}
        </VStack>
        <Divider mb={3} />
        <HStack align="end" spacing={2} flexWrap="wrap">
          <FormControl maxW="180px">
            <FormLabel fontSize="xs" mb={1}>
              {t('irrigationAutomation.name')}
            </FormLabel>
            <Input
              size="sm"
              value={pName}
              onChange={(e) => setPName(e.target.value)}
            />
          </FormControl>
          <FormControl maxW="160px">
            <FormLabel fontSize="xs" mb={1}>
              {t('irrigationAutomation.zone')}
            </FormLabel>
            <Select
              size="sm"
              placeholder="—"
              value={pZone}
              onChange={(e) =>
                setPZone(e.target.value ? Number(e.target.value) : '')
              }
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl maxW="120px">
            <FormLabel fontSize="xs" mb={1}>
              {t('irrigationAutomation.startTime')}
            </FormLabel>
            <Input
              size="sm"
              type="time"
              value={pTime}
              onChange={(e) => setPTime(e.target.value)}
            />
          </FormControl>
          <FormControl maxW="110px">
            <FormLabel fontSize="xs" mb={1}>
              {t('irrigationAutomation.durationMin')}
            </FormLabel>
            <Input
              size="sm"
              type="number"
              value={pDuration}
              onChange={(e) => setPDuration(e.target.value)}
            />
          </FormControl>
          <PermissionGate
            blocked={!canEdit}
            reason={t('access.editRequiresEditor')}
            ui="chakra"
          >
            <Button size="sm" colorScheme="green" onClick={addProgram}>
              {t('irrigationAutomation.addProgram')}
            </Button>
          </PermissionGate>
        </HStack>
      </Box>

      {/* Command history */}
      <Box {...card}>
        <Heading size="sm" mb={3}>
          {t('irrigationAutomation.historyTitle')}
        </Heading>
        {commands.length === 0 ? (
          <Text fontSize="sm" opacity={0.7}>
            {t('irrigationAutomation.noCommands')}
          </Text>
        ) : (
          <Box overflowX="auto">
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>{t('irrigationAutomation.zone')}</Th>
                  <Th>{t('irrigationAutomation.action')}</Th>
                  <Th>{t('irrigationAutomation.source')}</Th>
                  <Th>{t('irrigationAutomation.statusCol')}</Th>
                  <Th>{t('irrigationAutomation.time')}</Th>
                </Tr>
              </Thead>
              <Tbody>
                {commands.slice(0, 20).map((c) => (
                  <Tr key={c.id}>
                    <Td>{zoneName(c.zone_id)}</Td>
                    <Td>{t(`irrigationAutomation.${c.action}`)}</Td>
                    <Td>{t(`irrigationAutomation.src.${c.source}`)}</Td>
                    <Td>
                      <Badge colorScheme={STATUS_COLOR[c.status] ?? 'gray'}>
                        {t(`irrigationAutomation.status.${c.status}`)}
                      </Badge>
                    </Td>
                    <Td fontSize="xs">
                      {c.dispatched_at || c.created_at
                        ? new Date(
                            (c.dispatched_at || c.created_at) as string
                          ).toLocaleString()
                        : '—'}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </Box>
    </VStack>
  );
};

export default IrrigationAutomationPanel;
