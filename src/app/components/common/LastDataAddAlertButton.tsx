'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Box } from '@chakra-ui/react';
import { Button } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import AlertCreateDrawer from '../alert/AlertCreateDrawer';
import { useActiveZoneId } from './ActiveZoneContext';
import { useReadOnly } from '@/app/hooks/useReadOnly';

export interface LastDataAddAlertButtonProps {
  /** Sensor registry key (e.g. "temperature_weather"). When present
   *  the drawer prefills its form with mean-based defaults from
   *  /alerts/suggest. */
  sensorKey?: string;
  /** Explicit zone scope. Falls back to ActiveZoneContext when omitted
   *  so callers inside StationMain don't have to prop-drill it. */
  zoneId?: number;
  /** Override the visible label. */
  label?: string;
}

/** Affiché en bas des cartes "dernière valeur" à côté des graphiques.
 *  Opens the alert create drawer *in place* — never navigates away
 *  from the current page. */
export default function LastDataAddAlertButton({
  sensorKey,
  zoneId,
  label,
}: LastDataAddAlertButtonProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const ctxZoneId = useActiveZoneId();
  const readOnly = useReadOnly();
  const effectiveZoneId = zoneId ?? ctxZoneId ?? undefined;
  const effectiveLabel = label ?? t('misc.lastDataAddAlertButton.label');

  // Technicians have read-only access — no alert creation.
  if (readOnly) return null;

  return (
    <Box
      as="footer"
      mt="auto"
      pt={4}
      width="100%"
      display="flex"
      justifyContent="center"
    >
      <Button
        type="primary"
        danger
        icon={<BellOutlined />}
        onClick={() => setOpen(true)}
        aria-label={effectiveLabel}
      >
        {effectiveLabel}
      </Button>
      <AlertCreateDrawer
        open={open}
        onClose={() => setOpen(false)}
        sensorKey={sensorKey}
        zoneId={effectiveZoneId}
      />
    </Box>
  );
}
