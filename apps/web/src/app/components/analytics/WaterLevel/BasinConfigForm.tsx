'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  SimpleGrid,
  Text,
} from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import type { BasinGeometryRect } from '@/app/utils/basinVolume';

const KEY = (zoneId: number | null) =>
  `agrilogy_basin_override_v1_${zoneId ?? 'none'}`;

export function readBasinOverride(
  zoneId: number | null
): BasinGeometryRect | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY(zoneId));
    if (!raw) return null;
    const p = JSON.parse(raw) as Record<string, unknown>;
    const n = (v: unknown) =>
      typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
    return {
      lengthM: n(p.lengthM),
      widthM: n(p.widthM),
      heightM: n(p.heightM),
      sensorToMaxM: n(p.sensorToMaxM),
    };
  } catch {
    return null;
  }
}

/**
 * Per-browser fallback for the rectangle dimensions + sensor offset, used
 * until the admin fills the zone params. Values merge under the zone
 * geometry (zone wins when set).
 */
const BasinConfigForm = ({
  zoneId,
  initial,
  onChange,
}: {
  zoneId: number | null;
  initial: BasinGeometryRect;
  onChange: (next: BasinGeometryRect) => void;
}) => {
  const t = useTranslations();
  const [l, setL] = useState(
    initial.lengthM != null ? String(initial.lengthM) : ''
  );
  const [w, setW] = useState(
    initial.widthM != null ? String(initial.widthM) : ''
  );
  const [h, setH] = useState(
    initial.heightM != null ? String(initial.heightM) : ''
  );
  const [d, setD] = useState(
    initial.sensorToMaxM != null ? String(initial.sensorToMaxM) : ''
  );

  const save = () => {
    const toNum = (s: string) => {
      const v = Number(s.replace(',', '.'));
      return s.trim() !== '' && Number.isFinite(v) && v >= 0 ? v : null;
    };
    const next = {
      lengthM: toNum(l),
      widthM: toNum(w),
      heightM: toNum(h),
      sensorToMaxM: toNum(d),
    };
    try {
      localStorage.setItem(KEY(zoneId), JSON.stringify(next));
    } catch {
      /* private mode — ignore */
    }
    onChange(next);
  };

  return (
    <Box
      p={3}
      borderWidth="1px"
      borderRadius="md"
      borderStyle="dashed"
      width="100%"
    >
      <Text fontSize="xs" mb={2}>
        {t('analytics.waterLevel.basinConfigHint')}
      </Text>
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={2}>
        <FormControl>
          <FormLabel fontSize="xs">
            {t('analytics.waterLevel.basinLength')}
          </FormLabel>
          <Input
            size="sm"
            type="number"
            min={0}
            step="any"
            value={l}
            onChange={(e) => setL(e.target.value)}
            placeholder="10"
          />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="xs">
            {t('analytics.waterLevel.basinWidth')}
          </FormLabel>
          <Input
            size="sm"
            type="number"
            min={0}
            step="any"
            value={w}
            onChange={(e) => setW(e.target.value)}
            placeholder="5"
          />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="xs">
            {t('analytics.waterLevel.basinHeight')}
          </FormLabel>
          <Input
            size="sm"
            type="number"
            min={0}
            step="any"
            value={h}
            onChange={(e) => setH(e.target.value)}
            placeholder="2"
          />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="xs">
            {t('analytics.waterLevel.sensorToMax')}
          </FormLabel>
          <Input
            size="sm"
            type="number"
            min={0}
            step="any"
            value={d}
            onChange={(e) => setD(e.target.value)}
            placeholder="0.2"
          />
        </FormControl>
      </SimpleGrid>
      <Button size="sm" mt={2} onClick={save}>
        {t('analytics.waterLevel.saveBasin')}
      </Button>
    </Box>
  );
};

export default BasinConfigForm;
