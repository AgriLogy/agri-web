'use client';

/**
 * Compact, phone-style current-value badges for a LoRaWAN device's health
 * metrics — battery (V) and signal (RSSI dBm). We show only the *latest*
 * value (these are status readouts, not trends — you never want a battery
 * curve). If a zone reports neither (e.g. a Bivocom-only zone), the whole
 * thing renders nothing, so it never clutters non-LoRa dashboards.
 */

import { HStack, Text, Tooltip } from '@chakra-ui/react';
import {
  Battery,
  BatteryLow,
  BatteryMedium,
  BatteryWarning,
  Signal,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { fetchLastSensorSample } from '@/app/utils/fetchSensorLastValue';

type Props = { zoneId: number | null };

// Li/SOCl2 cell used by the RS485-LB: ~3.6 V fresh, ~3.0 V depleted.
const BAT_FULL = 3.6;
const BAT_EMPTY = 3.0;

function batteryPct(v: number): number {
  const pct = ((v - BAT_EMPTY) / (BAT_FULL - BAT_EMPTY)) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function batteryVisual(pct: number) {
  if (pct > 60) return { Icon: Battery, color: 'green.500' };
  if (pct > 35) return { Icon: BatteryMedium, color: 'green.500' };
  if (pct > 15) return { Icon: BatteryLow, color: 'orange.400' };
  return { Icon: BatteryWarning, color: 'red.500' };
}

function signalColor(dbm: number): string {
  if (dbm > -95) return 'green.500';
  if (dbm > -110) return 'orange.400';
  return 'red.500';
}

export default function DeviceStatusIndicator({ zoneId }: Props) {
  const t = useTranslations();
  const [battery, setBattery] = useState<number | null>(null);
  const [signal, setSignal] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoaded(false);
    Promise.all([
      fetchLastSensorSample('battery', zoneId),
      fetchLastSensorSample('signal', zoneId),
    ])
      .then(([b, s]) => {
        if (!alive) return;
        setBattery(b?.rawValue ?? null);
        setSignal(s?.rawValue ?? null);
        setLoaded(true);
      })
      .catch(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [zoneId]);

  // No device-health data (e.g. a Bivocom zone) → show nothing.
  if (!loaded || (battery == null && signal == null)) return null;

  const bat = battery != null ? batteryVisual(batteryPct(battery)) : null;

  return (
    <HStack
      spacing={3}
      px={2.5}
      py={1}
      borderWidth="1px"
      borderColor="app.border"
      borderRadius="full"
      bg="app.surface"
      fontSize="sm"
      fontWeight="medium"
      whiteSpace="nowrap"
    >
      {battery != null && bat && (
        <Tooltip
          label={`${t('sensors.battery')} · ${battery.toFixed(2)} V (${batteryPct(battery)}%)`}
        >
          <HStack spacing={1} color={bat.color}>
            <bat.Icon size={18} aria-label={t('sensors.battery')} />
            <Text color="app.text">{battery.toFixed(2)} V</Text>
          </HStack>
        </Tooltip>
      )}
      {signal != null && (
        <Tooltip label={`${t('sensors.signal')} · ${Math.round(signal)} dBm`}>
          <HStack spacing={1} color={signalColor(signal)}>
            <Signal size={18} aria-label={t('sensors.signal')} />
            <Text color="app.text">{Math.round(signal)} dBm</Text>
          </HStack>
        </Tooltip>
      )}
    </HStack>
  );
}
