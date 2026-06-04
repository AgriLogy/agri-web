'use client';

import React, { useCallback, useEffect, useState } from 'react';
import NextLink from 'next/link';
import {
  Badge,
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  HStack,
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
  useDisclosure,
  VStack,
} from '@chakra-ui/react';
import { MdPowerSettingsNew } from 'react-icons/md';
import { useTranslations } from 'next-intl';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import { ChartSection } from '@/app/components/layout/ChartSection';
import { PageInfoBar } from '@/app/components/layout/PageInfoBar';
import ValveSchematic from '@/app/components/vannes-pompes/ValveSchematic';
import PumpSchematic from '@/app/components/vannes-pompes/PumpSchematic';
import {
  dispatchVannesPompesUpdated,
  loadVannesPompesFromStorage,
  VANNES_POMPES_STORAGE_KEY,
  type Pump,
  type Vane,
} from '@/app/utils/vannesPompesStorage';

export type { Pump, Vane };

function newId(prefix: string) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const VannesPompesMain = () => {
  const t = useTranslations();
  const { bg, textColor, borderColor } = useColorModeStyles();
  const [vanes, setVanes] = useState<Vane[]>([]);
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const addVaneModal = useDisclosure();
  const addPumpModal = useDisclosure();
  const [newVaneName, setNewVaneName] = useState('');
  const [newVaneDevEui, setNewVaneDevEui] = useState('');
  const [newPumpName, setNewPumpName] = useState('');

  useEffect(() => {
    const { vanes: v, pumps: p } = loadVannesPompesFromStorage();
    setVanes(v);
    setPumps(p);
    setHydrated(true);
  }, []);

  const persist = useCallback((next: { vanes: Vane[]; pumps: Pump[] }) => {
    localStorage.setItem(VANNES_POMPES_STORAGE_KEY, JSON.stringify(next));
    dispatchVannesPompesUpdated();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persist({ vanes, pumps });
  }, [vanes, pumps, hydrated, persist]);

  const submitVane = () => {
    const name = newVaneName.trim();
    if (!name) return;
    const devEui = newVaneDevEui.trim() || '—';
    setVanes((prev) => [
      ...prev,
      {
        id: newId('vane'),
        name,
        devEui,
        active: false,
      },
    ]);
    setNewVaneName('');
    setNewVaneDevEui('');
    addVaneModal.onClose();
  };

  const submitPump = () => {
    const name = newPumpName.trim();
    if (!name) return;
    setPumps((prev) => [...prev, { id: newId('pump'), name, running: false }]);
    setNewPumpName('');
    addPumpModal.onClose();
  };

  const toggleVane = (id: string) => {
    setVanes((prev) =>
      prev.map((v) => (v.id === id ? { ...v, active: !v.active } : v))
    );
  };

  const togglePump = (id: string) => {
    setPumps((prev) =>
      prev.map((p) => (p.id === id ? { ...p, running: !p.running } : p))
    );
  };

  return (
    <Box px={{ base: 3, md: 4 }} py={{ base: 3, md: 4 }} color={textColor}>
      <PageInfoBar
        title={t('shell.vannesPompes.title')}
        subtitle={`${t('shell.vannesPompes.vaneCount', { count: vanes.length })} · ${t('shell.vannesPompes.pumpCount', { count: pumps.length })}`}
        actions={
          <HStack flexWrap="wrap" gap={2}>
            <Button colorScheme="brand" size="sm" onClick={addVaneModal.onOpen}>
              {t('shell.vannesPompes.addVane')}
            </Button>
            <Button
              colorScheme="brand"
              variant="outline"
              size="sm"
              onClick={addPumpModal.onOpen}
            >
              {t('shell.vannesPompes.addPump')}
            </Button>
            <Button
              as={NextLink}
              href="/vannes-pompes/schema"
              variant="outline"
              size="sm"
            >
              {t('shell.vannesPompes.schemaView')}
            </Button>
          </HStack>
        }
      />

      <VStack spacing={{ base: 3, md: 4 }} align="stretch" minW={0}>
        <ChartSection>
          <Heading
            size="md"
            mb={4}
            color="app.text"
            fontWeight="semibold"
            lineHeight="short"
          >
            {t('shell.vannesPompes.vanesHeading')}
          </Heading>
          {vanes.length === 0 ? (
            <Text color="app.text.muted">
              {t('shell.vannesPompes.emptyVanes')}
            </Text>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={6}>
              {vanes.map((vane, index) => (
                <VaneCard
                  key={vane.id}
                  vane={vane}
                  schematicLabel={String(index + 1)}
                  onToggle={() => toggleVane(vane.id)}
                  bg={bg}
                  borderColor={borderColor}
                />
              ))}
            </SimpleGrid>
          )}
        </ChartSection>

        <ChartSection>
          <Heading
            size="md"
            mb={4}
            color="app.text"
            fontWeight="semibold"
            lineHeight="short"
          >
            {t('shell.vannesPompes.pumpsHeading')}
          </Heading>
          {pumps.length === 0 ? (
            <Text color="app.text.muted">
              {t('shell.vannesPompes.emptyPumps')}
            </Text>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={6}>
              {pumps.map((pump) => (
                <PumpCard
                  key={pump.id}
                  pump={pump}
                  onToggle={() => togglePump(pump.id)}
                  bg={bg}
                  borderColor={borderColor}
                />
              ))}
            </SimpleGrid>
          )}
        </ChartSection>
      </VStack>

      <Modal isOpen={addVaneModal.isOpen} onClose={addVaneModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t('shell.vannesPompes.newVaneTitle')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>{t('shell.vannesPompes.nameLabel')}</FormLabel>
                <Input
                  value={newVaneName}
                  onChange={(e) => setNewVaneName(e.target.value)}
                  placeholder={t('shell.vannesPompes.vaneNamePlaceholder')}
                />
              </FormControl>
              <FormControl>
                <FormLabel>
                  {t('shell.vannesPompes.devEuiOptionalLabel')}
                </FormLabel>
                <Input
                  value={newVaneDevEui}
                  onChange={(e) => setNewVaneDevEui(e.target.value)}
                  placeholder="0004A30B00F7A7FE"
                  fontFamily="mono"
                  fontSize="sm"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={addVaneModal.onClose}>
              {t('shell.vannesPompes.cancel')}
            </Button>
            <Button colorScheme="brand" onClick={submitVane}>
              {t('shell.vannesPompes.create')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={addPumpModal.isOpen} onClose={addPumpModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t('shell.vannesPompes.newPumpTitle')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl isRequired>
              <FormLabel>{t('shell.vannesPompes.nameLabel')}</FormLabel>
              <Input
                value={newPumpName}
                onChange={(e) => setNewPumpName(e.target.value)}
                placeholder={t('shell.vannesPompes.pumpNamePlaceholder')}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={addPumpModal.onClose}>
              {t('shell.vannesPompes.cancel')}
            </Button>
            <Button colorScheme="brand" onClick={submitPump}>
              {t('shell.vannesPompes.create')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

function VaneCard({
  vane,
  schematicLabel,
  onToggle,
  bg,
  borderColor,
}: {
  vane: Vane;
  schematicLabel: string;
  onToggle: () => void;
  bg: string;
  borderColor: string;
}) {
  const t = useTranslations();
  const accent = vane.active ? 'green.400' : 'red.500';

  return (
    <Box
      bg={bg}
      borderWidth="1px"
      borderColor={borderColor}
      borderLeftWidth="4px"
      borderLeftColor={accent}
      borderRadius="md"
      p={4}
      boxShadow="sm"
    >
      <HStack align="flex-start" spacing={4}>
        <Box flexShrink={0}>
          <ValveSchematic active={vane.active} label={schematicLabel} />
        </Box>
        <VStack align="stretch" spacing={2} flex={1}>
          <HStack justify="space-between" align="center">
            <Text fontWeight="bold" fontSize="lg">
              {vane.name}
            </Text>
            <Badge colorScheme="gray" variant="subtle">
              {t('shell.vannesPompes.manual')}
            </Badge>
          </HStack>
          <Text fontSize="sm" opacity={0.85} fontFamily="mono">
            {t('shell.electrovanCard.devEui')}: {vane.devEui}
          </Text>
          <HStack>
            <Box
              w="10px"
              h="10px"
              borderRadius="full"
              bg={vane.active ? 'green.400' : 'gray.400'}
            />
            <Text fontSize="sm">
              {vane.active
                ? t('shell.vannesPompes.vaneOpen')
                : t('shell.vannesPompes.vaneClosed')}
            </Text>
          </HStack>
        </VStack>
      </HStack>
      <Button
        mt={4}
        w="100%"
        leftIcon={<MdPowerSettingsNew />}
        colorScheme={vane.active ? 'green' : 'red'}
        variant={vane.active ? 'solid' : 'solid'}
        onClick={onToggle}
      >
        {vane.active
          ? t('shell.vannesPompes.deactivate')
          : t('shell.vannesPompes.activate')}
      </Button>
    </Box>
  );
}

function PumpCard({
  pump,
  onToggle,
  bg,
  borderColor,
}: {
  pump: Pump;
  onToggle: () => void;
  bg: string;
  borderColor: string;
}) {
  const t = useTranslations();
  const accent = pump.running ? 'green.400' : 'gray.500';

  return (
    <Box
      bg={bg}
      borderWidth="1px"
      borderColor={borderColor}
      borderLeftWidth="4px"
      borderLeftColor={accent}
      borderRadius="md"
      p={4}
      boxShadow="sm"
    >
      <HStack align="flex-start" spacing={4}>
        <Box flexShrink={0}>
          <PumpSchematic running={pump.running} />
        </Box>
        <VStack align="stretch" spacing={2} flex={1}>
          <Text fontWeight="bold" fontSize="lg">
            {pump.name}
          </Text>
          <HStack>
            <Box
              w="10px"
              h="10px"
              borderRadius="full"
              bg={pump.running ? 'green.400' : 'gray.400'}
            />
            <Text fontSize="sm">
              {pump.running
                ? t('shell.vannesPompes.pumpRunning')
                : t('shell.vannesPompes.pumpStopped')}
            </Text>
          </HStack>
        </VStack>
      </HStack>
      <Button
        mt={4}
        w="100%"
        leftIcon={<MdPowerSettingsNew />}
        colorScheme={pump.running ? 'orange' : 'green'}
        onClick={onToggle}
      >
        {pump.running
          ? t('shell.vannesPompes.stop')
          : t('shell.vannesPompes.start')}
      </Button>
    </Box>
  );
}

export default VannesPompesMain;
