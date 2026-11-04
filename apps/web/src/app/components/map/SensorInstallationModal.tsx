'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Button,
  Collapse,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  NumberInput,
  NumberInputField,
  Select,
  SimpleGrid,
  Textarea,
  VStack,
} from '@chakra-ui/react';
import {
  MAINTENANCE_STATUSES,
  type SensorInstallation,
  type SensorInstallationWrite,
  type SensorKeyOption,
  type ZoneOption,
} from '@agri/api-client/farmMapApi';
import { SENSOR_TYPES, sensorTypeI18nKey } from '@/app/utils/sensorTypes';
import { DEFAULT_SENSOR_KEY } from '@/app/lib/farmMap/mapModel';

export interface SensorSectorOption {
  serverId: number;
  name: string;
}

export interface SensorModalTarget {
  mode: 'create' | 'edit';
  /** Present in edit mode. */
  installation?: SensorInstallation;
  sensorType: string;
  latitude: number;
  longitude: number;
  sectorServerId: number | null;
  defaultName: string;
}

interface Props {
  target: SensorModalTarget | null;
  sectors: SensorSectorOption[];
  zones: ZoneOption[];
  sensorKeys: SensorKeyOption[];
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (body: SensorInstallationWrite) => void;
}

type Draft = {
  name: string;
  sensor_type: string;
  latitude: string;
  longitude: string;
  sector_id: string;
  zone_id: string;
  sensor_key: string;
  installation_depth_cm: string;
  model: string;
  serial_number: string;
  node_id: string;
  installation_date: string;
  calibration_profile: string;
  notes: string;
  maintenance_status: string;
};

function draftFrom(target: SensorModalTarget): Draft {
  const i = target.installation;
  const s = (v: unknown) => (v == null ? '' : String(v));
  return {
    name: i?.name ?? target.defaultName,
    sensor_type: i?.sensor_type ?? target.sensorType,
    latitude: target.latitude.toFixed(6),
    longitude: target.longitude.toFixed(6),
    sector_id: s(target.sectorServerId),
    zone_id: s(i?.zone_id),
    sensor_key: i
      ? s(i.sensor_key)
      : (DEFAULT_SENSOR_KEY[target.sensorType] ?? ''),
    installation_depth_cm: s(i?.installation_depth_cm),
    model: s(i?.model),
    serial_number: s(i?.serial_number),
    node_id: s(i?.node_id),
    installation_date: s(i?.installation_date),
    calibration_profile: s(i?.calibration_profile),
    notes: s(i?.notes),
    maintenance_status: s(i?.maintenance_status),
  };
}

const orNull = (v: string) => (v.trim() ? v.trim() : null);
const numOrNull = (v: string) => {
  if (!v.trim()) return null;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/**
 * Sensor creation / edit form (agri-api#459): opened by a map click in
 * placement mode, or from the placed-sensors list. Required: name, type,
 * sector, position. Recommended + optional installation details are in a
 * collapsible section so the quick path stays short.
 */
export default function SensorInstallationModal({
  target,
  sectors,
  zones,
  sensorKeys,
  isSaving,
  onClose,
  onSubmit,
}: Props) {
  const t = useTranslations();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (target) {
      setDraft(draftFrom(target));
      setShowDetails(target.mode === 'edit');
    } else {
      setDraft(null);
    }
  }, [target]);

  if (!target || !draft) return null;

  const set = (k: keyof Draft) => (v: string) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  const lat = numOrNull(draft.latitude);
  const lon = numOrNull(draft.longitude);
  const latInvalid = lat == null || lat < -90 || lat > 90;
  const lonInvalid = lon == null || lon < -180 || lon > 180;
  const nameInvalid = !draft.name.trim();
  const invalid = latInvalid || lonInvalid || nameInvalid;

  const submit = () => {
    if (invalid) return;
    onSubmit({
      name: draft.name.trim(),
      sensor_type: draft.sensor_type,
      latitude: lat as number,
      longitude: lon as number,
      sector_id: draft.sector_id ? Number(draft.sector_id) : null,
      zone_id: draft.zone_id ? Number(draft.zone_id) : null,
      sensor_key: orNull(draft.sensor_key),
      installation_depth_cm: numOrNull(draft.installation_depth_cm),
      model: orNull(draft.model),
      serial_number: orNull(draft.serial_number),
      node_id: orNull(draft.node_id),
      installation_date: orNull(draft.installation_date),
      calibration_profile: orNull(draft.calibration_profile),
      notes: orNull(draft.notes),
      maintenance_status: (orNull(draft.maintenance_status) ??
        null) as SensorInstallationWrite['maintenance_status'],
    });
  };

  return (
    <Modal isOpen onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {target.mode === 'create'
            ? t('misc.map.sensorForm.createTitle')
            : t('misc.map.sensorForm.editTitle')}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack align="stretch" spacing={3}>
            <FormControl isRequired isInvalid={nameInvalid}>
              <FormLabel fontSize="sm">
                {t('misc.map.sensorForm.name')}
              </FormLabel>
              <Input
                size="sm"
                maxLength={100}
                value={draft.name}
                onChange={(e) => set('name')(e.target.value)}
                autoFocus
              />
              <FormErrorMessage>
                {t('misc.map.sensorForm.nameRequired')}
              </FormErrorMessage>
            </FormControl>

            <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">
                  {t('misc.map.sensorForm.type')}
                </FormLabel>
                <Select
                  size="sm"
                  value={draft.sensor_type}
                  onChange={(e) => set('sensor_type')(e.target.value)}
                >
                  {SENSOR_TYPES.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.mapSymbol} {t(`sensors.${sensorTypeI18nKey(st.id)}`)}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">
                  {t('misc.map.sensorForm.sector')}
                </FormLabel>
                <Select
                  size="sm"
                  value={draft.sector_id}
                  onChange={(e) => set('sector_id')(e.target.value)}
                >
                  <option value="">{t('misc.map.outOfSector')}</option>
                  {sectors.map((s) => (
                    <option key={s.serverId} value={String(s.serverId)}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl isRequired isInvalid={latInvalid}>
                <FormLabel fontSize="sm">
                  {t('misc.map.sensorForm.latitude')}
                </FormLabel>
                <NumberInput
                  size="sm"
                  value={draft.latitude}
                  onChange={set('latitude')}
                >
                  <NumberInputField />
                </NumberInput>
              </FormControl>
              <FormControl isRequired isInvalid={lonInvalid}>
                <FormLabel fontSize="sm">
                  {t('misc.map.sensorForm.longitude')}
                </FormLabel>
                <NumberInput
                  size="sm"
                  value={draft.longitude}
                  onChange={set('longitude')}
                >
                  <NumberInputField />
                </NumberInput>
              </FormControl>
            </SimpleGrid>

            <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
              <FormControl>
                <FormLabel fontSize="sm">
                  {t('misc.map.sensorForm.readingStream')}
                </FormLabel>
                <Select
                  size="sm"
                  value={draft.sensor_key}
                  onChange={(e) => set('sensor_key')(e.target.value)}
                >
                  <option value="">{t('misc.map.sensorForm.noStream')}</option>
                  {sensorKeys.map((k) => (
                    <option key={k.key} value={k.key}>
                      {k.label}
                      {k.unit ? ` (${k.unit})` : ''}
                    </option>
                  ))}
                </Select>
                <FormHelperText fontSize="xs">
                  {t('misc.map.sensorForm.readingStreamHint')}
                </FormHelperText>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">
                  {t('misc.map.sensorForm.zone')}
                </FormLabel>
                <Select
                  size="sm"
                  value={draft.zone_id}
                  onChange={(e) => set('zone_id')(e.target.value)}
                >
                  <option value="">{t('misc.map.sensorForm.anyZone')}</option>
                  {zones.map((z) => (
                    <option key={z.id} value={String(z.id)}>
                      {z.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
            </SimpleGrid>

            <Button
              size="xs"
              variant="link"
              alignSelf="flex-start"
              onClick={() => setShowDetails((v) => !v)}
            >
              {showDetails
                ? t('misc.map.sensorForm.hideDetails')
                : t('misc.map.sensorForm.showDetails')}
            </Button>
            <Collapse in={showDetails} animateOpacity>
              <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
                <FormControl>
                  <FormLabel fontSize="sm">
                    {t('misc.map.sensorForm.model')}
                  </FormLabel>
                  <Input
                    size="sm"
                    maxLength={100}
                    value={draft.model}
                    onChange={(e) => set('model')(e.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">
                    {t('misc.map.sensorForm.serial')}
                  </FormLabel>
                  <Input
                    size="sm"
                    maxLength={128}
                    value={draft.serial_number}
                    onChange={(e) => set('serial_number')(e.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">
                    {t('misc.map.sensorForm.depth')}
                  </FormLabel>
                  <NumberInput
                    size="sm"
                    min={0}
                    max={1000}
                    value={draft.installation_depth_cm}
                    onChange={set('installation_depth_cm')}
                  >
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">
                    {t('misc.map.sensorForm.nodeId')}
                  </FormLabel>
                  <Input
                    size="sm"
                    maxLength={128}
                    value={draft.node_id}
                    onChange={(e) => set('node_id')(e.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">
                    {t('misc.map.sensorForm.installDate')}
                  </FormLabel>
                  <Input
                    size="sm"
                    type="date"
                    value={draft.installation_date}
                    onChange={(e) => set('installation_date')(e.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">
                    {t('misc.map.sensorForm.maintenance')}
                  </FormLabel>
                  <Select
                    size="sm"
                    value={draft.maintenance_status}
                    onChange={(e) => set('maintenance_status')(e.target.value)}
                  >
                    <option value="">—</option>
                    {MAINTENANCE_STATUSES.map((m) => (
                      <option key={m} value={m}>
                        {t(`misc.map.maintenance.${m}`)}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">
                    {t('misc.map.sensorForm.calibration')}
                  </FormLabel>
                  <Input
                    size="sm"
                    maxLength={100}
                    value={draft.calibration_profile}
                    onChange={(e) => set('calibration_profile')(e.target.value)}
                  />
                </FormControl>
                <FormControl gridColumn={{ sm: 'span 2' }}>
                  <FormLabel fontSize="sm">
                    {t('misc.map.sensorForm.notes')}
                  </FormLabel>
                  <Textarea
                    size="sm"
                    maxLength={2000}
                    rows={2}
                    value={draft.notes}
                    onChange={(e) => set('notes')(e.target.value)}
                  />
                </FormControl>
              </SimpleGrid>
            </Collapse>
          </VStack>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button size="sm" variant="ghost" onClick={onClose}>
            {t('misc.map.cancel')}
          </Button>
          <Button
            size="sm"
            colorScheme="brand"
            onClick={submit}
            isDisabled={invalid}
            isLoading={isSaving}
          >
            {target.mode === 'create'
              ? t('misc.map.sensorForm.create')
              : t('misc.map.sensorForm.saveChanges')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
