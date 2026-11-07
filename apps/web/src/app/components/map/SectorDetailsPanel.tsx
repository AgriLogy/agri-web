'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Badge,
  Button,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Input,
  NumberInput,
  NumberInputField,
  Select,
  SimpleGrid,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react';
import {
  IRRIGATION_TYPES,
  type MapSector,
  type SectorStatus,
  type SectorWrite,
} from '@agri/api-client/farmMapApi';
import {
  formatArea,
  formatPerimeter,
  STATUS_COLORS,
} from '@/app/lib/farmMap/mapModel';
import SectorNdviPanel, { type NdviOverlay } from './SectorNdviPanel';

interface Props {
  sector: MapSector | null;
  status: SectorStatus | null;
  canEdit: boolean;
  isSaving: boolean;
  onZoom: () => void;
  onSave: (body: Omit<SectorWrite, 'name' | 'geometry' | 'color'>) => void;
  /** NDVI image currently laid over the map (one sector at a time). */
  ndviOverlay?: NdviOverlay | null;
  onNdviOverlay?: (o: NdviOverlay | null) => void;
}

type Draft = {
  crop: string;
  variety: string;
  planting_date: string;
  irrigation_type: string;
  root_depth_cm: string;
  is_active: boolean;
};

const fromSector = (s: MapSector): Draft => ({
  crop: s.crop ?? '',
  variety: s.variety ?? '',
  planting_date: s.planting_date ?? '',
  irrigation_type: s.irrigation_type ?? '',
  root_depth_cm: s.root_depth_cm == null ? '' : String(s.root_depth_cm),
  is_active: s.is_active ?? true,
});

/**
 * Selected sector: area / perimeter (server-computed), live status, and the
 * agronomic details (crop, variety, planting date, irrigation, root depth,
 * active). Read-only for monitor-tier users.
 */
export default function SectorDetailsPanel({
  sector,
  status,
  canEdit,
  isSaving,
  onZoom,
  onSave,
  ndviOverlay = null,
  onNdviOverlay,
}: Props) {
  const t = useTranslations();
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    setDraft(sector ? fromSector(sector) : null);
  }, [sector]);

  if (!sector || !draft) return null;
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));
  const area = formatArea(sector.area_ha);
  const perimeter = formatPerimeter(sector.perimeter_m);
  const metadataSupported = sector.is_active !== undefined;
  const depth = draft.root_depth_cm.trim() ? Number(draft.root_depth_cm) : null;
  const depthInvalid =
    depth != null && (!Number.isFinite(depth) || depth <= 0 || depth > 500);

  return (
    <VStack align="stretch" spacing={2}>
      <Flex justify="space-between" align="center" gap={2} wrap="wrap">
        <HStack spacing={2} wrap="wrap">
          <Text fontSize="sm" fontWeight="semibold">
            {sector.name}
          </Text>
          {area ? <Badge colorScheme="green">{area}</Badge> : null}
          {perimeter ? (
            <Badge variant="outline">
              {t('misc.map.sectorDetails.perimeter', { value: perimeter })}
            </Badge>
          ) : null}
          {status ? (
            <Badge
              bg={STATUS_COLORS[status.status]}
              color="white"
              title={t('misc.map.sectorDetails.sensorCount', {
                count: status.sensor_count,
              })}
            >
              {t(`misc.map.status.${status.status}`)}
            </Badge>
          ) : null}
        </HStack>
        <Button size="xs" variant="outline" onClick={onZoom}>
          {t('misc.map.zoomToSector')}
        </Button>
      </Flex>
      {!area && sector.geometry ? (
        <Text fontSize="xs" color="gray.500">
          {t('misc.map.sectorDetails.areaPending')}
        </Text>
      ) : null}
      {metadataSupported ? (
        <>
          <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={2}>
            <FormControl isDisabled={!canEdit}>
              <FormLabel fontSize="xs" mb={1}>
                {t('misc.map.sectorDetails.crop')}
              </FormLabel>
              <Input
                size="sm"
                maxLength={80}
                value={draft.crop}
                onChange={(e) => set('crop', e.target.value)}
              />
            </FormControl>
            <FormControl isDisabled={!canEdit}>
              <FormLabel fontSize="xs" mb={1}>
                {t('misc.map.sectorDetails.variety')}
              </FormLabel>
              <Input
                size="sm"
                maxLength={80}
                value={draft.variety}
                onChange={(e) => set('variety', e.target.value)}
              />
            </FormControl>
            <FormControl isDisabled={!canEdit}>
              <FormLabel fontSize="xs" mb={1}>
                {t('misc.map.sectorDetails.plantingDate')}
              </FormLabel>
              <Input
                size="sm"
                type="date"
                value={draft.planting_date}
                onChange={(e) => set('planting_date', e.target.value)}
              />
            </FormControl>
            <FormControl isDisabled={!canEdit}>
              <FormLabel fontSize="xs" mb={1}>
                {t('misc.map.sectorDetails.irrigationType')}
              </FormLabel>
              <Select
                size="sm"
                value={draft.irrigation_type}
                onChange={(e) => set('irrigation_type', e.target.value)}
              >
                <option value="">—</option>
                {IRRIGATION_TYPES.map((it) => (
                  <option key={it} value={it}>
                    {t(`misc.map.irrigation.${it}`)}
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormControl isDisabled={!canEdit} isInvalid={depthInvalid}>
              <FormLabel fontSize="xs" mb={1}>
                {t('misc.map.sectorDetails.rootDepth')}
              </FormLabel>
              <NumberInput
                size="sm"
                min={1}
                max={500}
                value={draft.root_depth_cm}
                onChange={(v) => set('root_depth_cm', v)}
              >
                <NumberInputField />
              </NumberInput>
            </FormControl>
            <FormControl
              isDisabled={!canEdit}
              display="flex"
              alignItems="flex-end"
              gap={2}
            >
              <Switch
                size="sm"
                colorScheme="brand"
                isChecked={draft.is_active}
                onChange={(e) => set('is_active', e.target.checked)}
                id="sector-active"
              />
              <FormLabel htmlFor="sector-active" fontSize="xs" mb={0}>
                {t('misc.map.sectorDetails.active')}
              </FormLabel>
            </FormControl>
          </SimpleGrid>
          {canEdit ? (
            <Button
              size="sm"
              colorScheme="brand"
              alignSelf="flex-start"
              isLoading={isSaving}
              isDisabled={depthInvalid}
              onClick={() =>
                onSave({
                  crop: draft.crop.trim() || null,
                  variety: draft.variety.trim() || null,
                  planting_date: draft.planting_date || null,
                  irrigation_type: (draft.irrigation_type ||
                    null) as SectorWrite['irrigation_type'],
                  root_depth_cm: depth,
                  is_active: draft.is_active,
                })
              }
            >
              {t('misc.map.sectorDetails.save')}
            </Button>
          ) : null}
        </>
      ) : null}
      {onNdviOverlay ? (
        <SectorNdviPanel
          sector={sector}
          overlay={ndviOverlay}
          onOverlay={onNdviOverlay}
        />
      ) : null}
    </VStack>
  );
}
