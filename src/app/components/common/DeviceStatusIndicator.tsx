'use client';

/**
 * Compact device-health badge — battery (V) and signal (RSSI dBm) for a
 * LoRaWAN node, shown as small icon+value chips (latest value only, like a
 * phone status bar — never a curve). Designed to sit in the top-right corner
 * of a "last reading" card. Renders nothing when a zone reports neither
 * (e.g. a Bivocom zone), so it never clutters non-LoRa dashboards.
 */

import { HStack, Text, Tooltip, VStack } from '@chakra-ui/react';
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

// RSSI (dBm) → a human label key. Farmers read "Good"/"Weak", not "-113 dBm".
function signalLevelKey(dbm: number): 'strong' | 'good' | 'fair' | 'weak' {
  if (dbm > -90) return 'strong';
  if (dbm > -100) return 'good';
  if (dbm > -110) return 'fair';
  return 'weak';
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
    <VStack
      spacing={0.5}
      align="flex-end"
      bg="blackAlpha.50"
      _dark={{ bg: 'whiteAlpha.200' }}
      borderRadius="lg"
      px={2}
      py={1}
      fontSize="xs"
      fontWeight="medium"
      lineHeight="1.2"
    >
      {battery != null && bat && (
        <Tooltip
          label={`${t('sensors.battery')} · ${battery.toFixed(2)} V (${batteryPct(battery)}%)`}
          openDelay={300}
        >
          <HStack spacing={1} color={bat.color}>
            <bat.Icon size={15} aria-label={t('sensors.battery')} />
            <Text color="inherit">{batteryPct(battery)}%</Text>
          </HStack>
        </Tooltip>
      )}
      {signal != null && (
        <Tooltip
          label={`${t('sensors.signal')} · ${Math.round(signal)} dBm`}
          openDelay={300}
        >
          <HStack spacing={1} color={signalColor(signal)}>
            <Signal size={15} aria-label={t('sensors.signal')} />
            <Text color="inherit">
              {t(`deviceStatus.signal.${signalLevelKey(signal)}`)}
            </Text>
          </HStack>
        </Tooltip>
      )}
    </VStack>
  );
}
