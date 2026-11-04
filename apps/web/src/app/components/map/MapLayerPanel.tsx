'use client';

import { useTranslations } from 'next-intl';
import {
  Box,
  Divider,
  FormControl,
  FormLabel,
  HStack,
  Select,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react';
import type {
  Basemap,
  LayerPref,
  MapStatus,
} from '@agri/api-client/farmMapApi';
import { BASEMAP_IDS, STATUS_COLORS } from '@/app/lib/farmMap/mapModel';

/** Operational layers the panel controls. Opacity is optional per layer. */
export const MAP_LAYERS: { id: MapLayerId; opacity: boolean }[] = [
  { id: 'sectors', opacity: true },
  { id: 'sector_status', opacity: true },
  { id: 'labels', opacity: false },
  { id: 'sensors', opacity: true },
  { id: 'sensor_names', opacity: false },
  { id: 'devices', opacity: false },
];

export type MapLayerId =
  | 'sectors'
  | 'sector_status'
  | 'labels'
  | 'sensors'
  | 'sensor_names'
  | 'devices';

export const DEFAULT_LAYER_PREFS: Record<MapLayerId, LayerPref> = {
  sectors: { visible: true, opacity: 1 },
  sector_status: { visible: false, opacity: 0.6 },
  labels: { visible: true, opacity: 1 },
  sensors: { visible: true, opacity: 1 },
  sensor_names: { visible: true, opacity: 1 },
  devices: { visible: true, opacity: 1 },
};

const LEGEND: MapStatus[] = [
  'normal',
  'warning',
  'critical',
  'offline',
  'no_data',
];

interface Props {
  basemap: Basemap;
  layers: Record<MapLayerId, LayerPref>;
  onBasemapChange: (b: Basemap) => void;
  onLayerChange: (id: MapLayerId, pref: LayerPref) => void;
}

/** Basemap switcher + layer visibility / opacity + status legend. */
export default function MapLayerPanel({
  basemap,
  layers,
  onBasemapChange,
  onLayerChange,
}: Props) {
  const t = useTranslations();
  return (
    <VStack align="stretch" spacing={3} minW="240px">
      <FormControl>
        <FormLabel fontSize="xs" mb={1} fontWeight="semibold">
          {t('misc.map.layers.basemap')}
        </FormLabel>
        <Select
          size="sm"
          value={basemap}
          onChange={(e) => onBasemapChange(e.target.value as Basemap)}
        >
          {BASEMAP_IDS.map((b) => (
            <option key={b} value={b}>
              {t(`misc.map.basemaps.${b}`)}
            </option>
          ))}
        </Select>
      </FormControl>
      <Divider />
      <Text fontSize="xs" fontWeight="semibold">
        {t('misc.map.layers.title')}
      </Text>
      {MAP_LAYERS.map(({ id, opacity }) => {
        const pref = layers[id];
        return (
          <Box key={id}>
            <HStack justify="space-between">
              <Text fontSize="sm">{t(`misc.map.layers.${id}`)}</Text>
              <Switch
                size="sm"
                colorScheme="brand"
                isChecked={pref.visible}
                onChange={(e) =>
                  onLayerChange(id, { ...pref, visible: e.target.checked })
                }
                aria-label={t(`misc.map.layers.${id}`)}
              />
            </HStack>
            {opacity && pref.visible ? (
              <Slider
                size="sm"
                min={0.1}
                max={1}
                step={0.05}
                value={pref.opacity}
                onChange={(v) => onLayerChange(id, { ...pref, opacity: v })}
                aria-label={t('misc.map.layers.opacity')}
              >
                <SliderTrack>
                  <SliderFilledTrack bg="brand.500" />
                </SliderTrack>
                <SliderThumb boxSize={3} />
              </Slider>
            ) : null}
          </Box>
        );
      })}
      <Divider />
      <Text fontSize="xs" fontWeight="semibold">
        {t('misc.map.layers.legend')}
      </Text>
      <VStack align="stretch" spacing={1}>
        {LEGEND.map((s) => (
          <HStack key={s} spacing={2}>
            <Box
              w="10px"
              h="10px"
              borderRadius="full"
              bg={STATUS_COLORS[s]}
              flexShrink={0}
            />
            <Text fontSize="xs">{t(`misc.map.status.${s}`)}</Text>
          </HStack>
        ))}
      </VStack>
      <Text fontSize="2xs" color="gray.500">
        {t('misc.map.layers.satelliteSoon')}
      </Text>
    </VStack>
  );
}
