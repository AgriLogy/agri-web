'use client';

import {
  Button,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  useDisclosure,
  useToken,
} from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import type {
  ChartFrequency,
  FrequencyUnit,
} from '@/app/utils/chartDateWindow';

export type ChartFrequencyControlProps = {
  value: ChartFrequency;
  onChange: (next: ChartFrequency) => void;
  /** ARIA label — the selector is iconless so it needs a name. */
  label?: string;
};

const UNITS: FrequencyUnit[] = ['minute', 'hour', 'day'];

/**
 * Page-level "data frequency" picker shared by the analytics header. Presets
 * (minute / hour / day) average every chart on the page to that bucket;
 * "custom" opens a small modal to pick an arbitrary `amount × unit` window
 * (e.g. every 15 minutes). Averaging itself is client-side — see
 * {@link averageByFrequency}.
 */
export function ChartFrequencyControl({
  value,
  onChange,
  label,
}: ChartFrequencyControlProps) {
  const t = useTranslations();
  const [border] = useToken('colors', ['app.border']);
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Draft state for the custom modal, seeded from the current custom value.
  const [amount, setAmount] = useState<string>(
    value.kind === 'custom' ? String(value.amount) : '15'
  );
  const [unit, setUnit] = useState<FrequencyUnit>(
    value.kind === 'custom' ? value.unit : 'minute'
  );

  const UNIT_NOUN: Record<FrequencyUnit, string> = {
    minute: t('shell.chartDataFrequency.unitMinute'),
    hour: t('shell.chartDataFrequency.unitHour'),
    day: t('shell.chartDataFrequency.unitDay'),
  };
  const unitLabel = (u: FrequencyUnit) => UNIT_NOUN[u];

  const customLabel =
    value.kind === 'custom'
      ? `${t('shell.chartDataFrequency.custom')} · ${value.amount} ${unitLabel(
          value.unit
        )}`
      : t('shell.chartDataFrequency.custom');

  const selectValue = value.kind === 'custom' ? 'custom' : value.kind;

  const openCustom = () => {
    if (value.kind === 'custom') {
      setAmount(String(value.amount));
      setUnit(value.unit);
    }
    onOpen();
  };

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    if (next === 'custom') {
      openCustom();
      return;
    }
    onChange({ kind: next as 'minute' | 'hour' | 'day' });
  };

  const applyCustom = () => {
    const parsed = Math.max(1, Math.floor(Number(amount) || 1));
    onChange({ kind: 'custom', amount: parsed, unit });
    onClose();
  };

  return (
    <>
      <Select
        aria-label={label ?? t('shell.chartDataFrequency.label')}
        value={selectValue}
        onChange={handleSelect}
        width="auto"
        minW={{ base: '130px', md: '170px' }}
        maxW={{ base: '200px', md: 'none' }}
        size="md"
        bg="app.surface"
        color="app.text"
        borderColor={border}
        _hover={{ borderColor: 'app.accent' }}
        _focus={{ borderColor: 'app.accent', boxShadow: 'none' }}
      >
        <option value="minute">{t('shell.chartDataFrequency.minute')}</option>
        <option value="hour">{t('shell.chartDataFrequency.hour')}</option>
        <option value="day">{t('shell.chartDataFrequency.day')}</option>
        <option value="custom">{customLabel}</option>
      </Select>

      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t('shell.chartDataFrequency.customTitle')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <HStack align="end" spacing={3}>
              <FormControl>
                <FormLabel>
                  {t('shell.chartDataFrequency.amountLabel')}
                </FormLabel>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>{t('shell.chartDataFrequency.unitLabel')}</FormLabel>
                <Select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as FrequencyUnit)}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {unitLabel(u)}
                    </option>
                  ))}
                </Select>
              </FormControl>
            </HStack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" onClick={onClose}>
              {t('shell.chartDataFrequency.cancel')}
            </Button>
            <Button colorScheme="green" onClick={applyCustom}>
              {t('shell.chartDataFrequency.apply')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
