'use client';

/**
 * Farm visualization — a read-only schematic of the farm as simple shapes:
 * sector rectangles → zone boxes → captors (sensors) inside each. Captors are
 * shown for sensors configured on the zone OR with recent data; hovering a
 * captor reveals its last-received time. Clicking a zone opens its soil charts.
 * Includes a light "organise zones into sectors" manager.
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
  Spinner,
  Text,
  Tooltip,
  useDisclosure,
  useToast,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import { FaPen, FaPlus, FaTrash } from 'react-icons/fa';
import { farmApi, type Captor, type FarmSectorNode } from '@agri/api-client';
import useColorModeStyles from '@/app/utils/useColorModeStyles';

const RECENT_MS = 24 * 60 * 60 * 1000; // "fresh" if a reading arrived within 24h

function useCaptorStatus() {
  const t = useTranslations();
  return useCallback(
    (c: Captor): { color: string; tip: string } => {
      if (!c.last_received) {
        return { color: 'gray.400', tip: t('farm.captor.noData') };
      }
      const age = Date.now() - new Date(c.last_received).getTime();
      const when = new Date(c.last_received).toLocaleString();
      return {
        color: age <= RECENT_MS ? 'green.400' : 'orange.400',
        tip: t('farm.captor.lastReceived', { when }),
      };
    },
    [t]
  );
}

export default function FarmPage() {
  const t = useTranslations();
  const router = useRouter();
  const toast = useToast();
  const captorStatus = useCaptorStatus();
  const { bgColor, borderColor, mutedTextColor } = useColorModeStyles();

  const [data, setData] = useState<FarmSectorNode[] | null>(null);
  const [loading, setLoading] = useState(true);
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

  if (loading && !data) {
    return (
      <Flex justify="center" align="center" minH="60vh">
        <Spinner size="xl" />
      </Flex>
    );
  }

  return (
    <Box p={{ base: 3, md: 6 }}>
      <Heading size="lg" mb={1}>
        {t('farm.title')}
      </Heading>
      <Text color={mutedTextColor} mb={4}>
        {t('farm.subtitle')}
      </Text>

      {/* Create-sector bar */}
      <HStack mb={5} maxW="420px">
        <Input
          placeholder={t('farm.newSectorPlaceholder')}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createSector()}
          size="sm"
        />
        <Button
          leftIcon={<FaPlus />}
          size="sm"
          colorScheme="green"
          onClick={createSector}
        >
          {t('farm.addSector')}
        </Button>
      </HStack>

      <Flex direction="column" gap={5}>
        {(data ?? []).map((sector) => (
          <Box
            key={sector.sector_id ?? 'unassigned'}
            borderWidth="2px"
            borderColor={sector.sector_id === null ? 'gray.300' : 'green.300'}
            borderRadius="xl"
            bg={bgColor}
            p={4}
          >
            <Flex justify="space-between" align="center" mb={3}>
              <Heading size="md">
                {sector.sector_name ?? t('farm.unassigned')}{' '}
                <Text as="span" fontSize="sm" color={mutedTextColor}>
                  ({sector.zones.length})
                </Text>
              </Heading>
              {sector.sector_id !== null && (
                <HStack>
                  <Button
                    size="xs"
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
                    size="xs"
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
              <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={3}>
                {sector.zones.map((zone) => (
                  <Box
                    key={zone.zone_id}
                    borderWidth="1px"
                    borderColor={borderColor}
                    borderRadius="lg"
                    p={3}
                    cursor="pointer"
                    _hover={{ borderColor: 'green.400', shadow: 'sm' }}
                    onClick={() => router.push(`/soil?zone=${zone.zone_id}`)}
                  >
                    <Text fontWeight="bold" mb={2} noOfLines={1}>
                      {zone.zone_name}
                    </Text>
                    {zone.captors.length === 0 ? (
                      <Text fontSize="xs" color={mutedTextColor}>
                        {t('farm.noCaptors')}
                      </Text>
                    ) : (
                      <Wrap spacing={1}>
                        {zone.captors.map((c) => {
                          const { color, tip } = captorStatus(c);
                          return (
                            <WrapItem key={c.sensor_key}>
                              <Tooltip label={tip} hasArrow>
                                <HStack
                                  spacing={1}
                                  px={2}
                                  py={0.5}
                                  borderWidth="1px"
                                  borderColor={borderColor}
                                  borderRadius="full"
                                  fontSize="xs"
                                >
                                  <Box
                                    w={2}
                                    h={2}
                                    borderRadius="full"
                                    bg={color}
                                  />
                                  <Text noOfLines={1}>
                                    {sensorLabel(c.sensor_key)}
                                  </Text>
                                </HStack>
                              </Tooltip>
                            </WrapItem>
                          );
                        })}
                      </Wrap>
                    )}
                  </Box>
                ))}
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
            <Button colorScheme="green" onClick={saveAssign}>
              {t('farm.save')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
