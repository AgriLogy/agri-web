'use client';

import { Select, useToken } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';

export type ZoneOption = {
  id: number;
  name: string;
  /** Sector grouping (User → Sector → Zone). Null = unassigned. */
  sector_id?: number | null;
  sector_name?: string | null;
  /** Basin geometry (present only for zones with a level sensor). */
  basin_max_depth_m?: number | null;
  basin_area_m2?: number | null;
  sensor_mount_offset_m?: number | null;
};

export type ZoneSelectProps = {
  zones: ZoneOption[];
  value: number | null;
  onChange: (zoneId: number) => void;
  /** ARIA label - the selector is iconless so it needs a name. */
  label?: string;
};

/**
 * Token-driven zone picker. Replaces the raw `<select>` blocks the
 * analytics pages used to inline (each with their own colour math).
 */
export function ZoneSelect({ zones, value, onChange, label }: ZoneSelectProps) {
  const t = useTranslations();
  const [border] = useToken('colors', ['app.border']);
  const ariaLabel = label ?? t('shell.zoneSelect.label');

  // Group zones under their sector (User → Sector → Zone). Only render optgroups
  // when at least one zone is assigned, so an all-flat farm stays a plain list.
  const hasSectors = zones.some((z) => z.sector_name);
  const groups = new Map<string, ZoneOption[]>();
  if (hasSectors) {
    const unassigned = t('shell.zoneSelect.unassigned');
    for (const z of zones) {
      const key = z.sector_name ?? unassigned;
      const arr = groups.get(key);
      if (arr) arr.push(z);
      else groups.set(key, [z]);
    }
  }

  return (
    <Select
      aria-label={ariaLabel}
      value={value ?? ''}
      onChange={(e) => onChange(Number(e.target.value))}
      width="auto"
      // Narrower on phones so Zone + date icon + alert bell share one line.
      minW={{ base: '120px', md: '180px' }}
      maxW={{ base: '190px', md: 'none' }}
      size="md"
      bg="app.surface"
      color="app.text"
      borderColor={border}
      _hover={{ borderColor: 'app.accent' }}
      _focus={{ borderColor: 'app.accent', boxShadow: 'none' }}
    >
      {hasSectors
        ? [...groups.entries()].map(([sector, zs]) => (
            <optgroup key={sector} label={sector}>
              {zs.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </optgroup>
          ))
        : zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.name}
            </option>
          ))}
    </Select>
  );
}
