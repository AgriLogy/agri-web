'use client';

/**
 * Farm visualization — a read-only 2D schematic of the farm as nested shapes:
 * sector rectangles → zone rectangles → a compact grid of captor dots. A dot's
 * colour is its freshness (green <24h, amber stale, grey none); hovering shows
 * the sensor name + last-received time. Clicking a zone opens its soil charts.
 * A light manager lets you create sectors and assign zones.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Box,
  Button,
  Checkbox,
  Flex,
  Heading,
  HStack,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Text,
  Tooltip,
  useDisclosure,
  useToast,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import { FaPen, FaPlus, FaTrash } from 'react-icons/fa';
import { farmApi, type Captor, type FarmSectorNode } from '@agri/api-client';
import Loading from '@/app/components/common/Loading';
import useColorModeStyles from '@/app/utils/useColorModeStyles';

const RECENT_MS = 24 * 60 * 60 * 1000; // "fresh" if a reading arrived within 24h

export default function FarmPage() {
  const t = useTranslations();
  const router = useRouter();
  const toast = useToast();
  const { bgColor, borderColor, mutedTextColor } = useColorModeStyles();

  const [data, setData] = useState<FarmSectorNode[] | null>(null);
  const [loading, setLoading] = useState(true);
  // Captured once (impure Date.now() is fine in a useState initializer) so the
  // freshness check stays render-pure. 24h granularity — mount-time is fine.
  const [now] = useState(() => Date.now());
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(
    null
  );
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const { isOpen, onOpen, onClose } = useDisclosure();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await farmApi.overview());
    } catch {
      toast({ title: t('farm.loadError'), status: 'error', duration: 3000 });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const allZones = useMemo(
    () =>
      (data ?? []).flatMap((s) =>
        s.zones.map((z) => ({ ...z, sectorId: s.sector_id }))
      ),
    [data]
  );

  const sensorLabel = (key: string) =>
    t.has(`sensors.${key}`) ? t(`sensors.${key}`) : key.replace(/_/g, ' ');

  const captorDot = (c: Captor): { color: string; tip: string } => {
    const name = sensorLabel(c.sensor_key);
    if (!c.last_received) {
      return { color: 'gray.400', tip: `${name} · ${t('farm.captor.noData')}` };
    }
    const age = now - new Date(c.last_received).getTime();
    const when = new Date(c.last_received).toLocaleString();
    return {
      color: age <= RECENT_MS ? 'green.400' : 'orange.400',
      tip: `${name} · ${t('farm.captor.lastReceived', { when })}`,
    };
  };

  const createSector = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await farmApi.createSector(name);
      setNewName('');
      await load();
    } catch {
      toast({ title: t('farm.saveError'), status: 'error', duration: 3000 });
    }
  };

  const openAssign = (sectorId: number, name: string) => {
    setEditing({ id: sectorId, name });
    setPicked(
      new Set(
        allZones.filter((z) => z.sectorId === sectorId).map((z) => z.zone_id)
      )
    );
    onOpen();
  };

  const saveAssign = async () => {
    if (!editing) return;
    try {
      await farmApi.setSectorZones(editing.id, [...picked]);
      onClose();
      await load();
    } catch {
      toast({ title: t('farm.saveError'), status: 'error', duration: 3000 });
    }
  };

  const removeSector = async (id: number) => {
    try {
      await farmApi.deleteSector(id);
      await load();
    } catch {
      toast({ title: t('farm.saveError'), status: 'error', duration: 3000 });
    }
  };

  const zoneBox = (zone: FarmSectorNode['zones'][number]) => (
    <Box
      key={zone.zone_id}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="lg"
      p={3}
      cursor="pointer"
      transition="all 0.15s"
      _hover={{ borderColor: 'brand.400', shadow: 'sm' }}
      onClick={() => router.push(`/soil?zone=${zone.zone_id}`)}
    >
      <Flex justify="space-between" align="baseline" mb={2} gap={2}>
        <Text fontWeight="bold" noOfLines={1}>
          {zone.zone_name}
        </Text>
        <Text fontSize="xs" color={mutedTextColor} flexShrink={0}>
          {t('farm.captorCount', { count: zone.captors.length })}
        </Text>
      </Flex>
      {zone.captors.length === 0 ? (
        <Text fontSize="xs" color={mutedTextColor}>
          {t('farm.noCaptors')}
        </Text>
      ) : (
        <Wrap spacing={2}>
          {zone.captors.map((c) => {
            const { color, tip } = captorDot(c);
            return (
              <WrapItem key={c.sensor_key}>
                <Tooltip label={tip} hasArrow openDelay={150}>
                  <Box
                    w="14px"
                    h="14px"
                    borderRadius="full"
                    bg={color}
                    borderWidth="1px"
                    borderColor="blackAlpha.200"
                  />
                </Tooltip>
              </WrapItem>
            );
          })}
        </Wrap>
      )}
    </Box>
  );

  if (loading && !data) return <Loading />;

  return (
    <Box p={{ base: 3, md: 6 }}>
      <Heading size="lg" mb={1}>
        {t('farm.title')}
      </Heading>
      <Text color={mutedTextColor} mb={4}>
        {t('farm.subtitle')}
      </Text>

      {/* Create-sector bar */}
      <Flex mb={5} gap={3} maxW="520px" align="center">
        <Input
          placeholder={t('farm.newSectorPlaceholder')}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createSector()}
        />
        <Button
          leftIcon={<FaPlus />}
          colorScheme="brand"
          onClick={createSector}
          flexShrink={0}
        >
          {t('farm.addSector')}
        </Button>
      </Flex>

      <Flex direction="column" gap={5}>
        {(data ?? []).map((sector) => (
          <Box
            key={sector.sector_id ?? 'unassigned'}
            borderWidth="2px"
            borderColor={sector.sector_id === null ? 'gray.300' : 'brand.300'}
            borderRadius="xl"
            bg={bgColor}
            p={4}
          >
            <Flex justify="space-between" align="center" mb={3} gap={2}>
              <Heading size="md" noOfLines={1}>
                {sector.sector_name ?? t('farm.unassigned')}{' '}
                <Text as="span" fontSize="sm" color={mutedTextColor}>
                  ({sector.zones.length})
                </Text>
              </Heading>
              {sector.sector_id !== null && (
                <HStack flexShrink={0}>
                  <Button
                    size="sm"
                    leftIcon={<FaPen />}
                    variant="outline"
                    onClick={() =>
                      openAssign(sector.sector_id!, sector.sector_name!)
                    }
                  >
                    {t('farm.assignZones')}
                  </Button>
                  <IconButton
                    aria-label={t('farm.deleteSector')}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    icon={<FaTrash />}
                    onClick={() => removeSector(sector.sector_id!)}
                  />
                </HStack>
              )}
            </Flex>

            {sector.zones.length === 0 ? (
              <Text color={mutedTextColor} fontSize="sm">
                {t('farm.noZones')}
              </Text>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={3}>
                {sector.zones.map(zoneBox)}
              </SimpleGrid>
            )}
          </Box>
        ))}
      </Flex>

      {/* Assign-zones modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {t('farm.assignTo', { name: editing?.name ?? '' })}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Flex direction="column" gap={2}>
              {allZones.map((z) => (
                <Checkbox
                  key={z.zone_id}
                  isChecked={picked.has(z.zone_id)}
                  onChange={(e) =>
                    setPicked((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(z.zone_id);
                      else next.delete(z.zone_id);
                      return next;
                    })
                  }
                >
                  {z.zone_name}
                </Checkbox>
              ))}
            </Flex>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              {t('farm.cancel')}
            </Button>
            <Button colorScheme="brand" onClick={saveAssign}>
              {t('farm.save')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
