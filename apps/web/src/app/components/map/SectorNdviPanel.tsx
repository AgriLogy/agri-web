'use client';

/**
 * NDVI for the selected sector (agri-api#459 phase 2): Sentinel-2 dates
 * (cloudy scenes skipped), the latest clear-sky mean with a vigour class and
 * change since the previous clear date, a small history chart, and a toggle
 * that lays the colourised NDVI image over the sector on the map.
 *
 * NDVI is vegetation vigour from 10 m pixels: it is not plant density and it
 * does not show where irrigation water went. The note under the numbers says
 * so, and dates with < 60 % clear pixels are flagged rather than trusted.
 */

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Box,
  Flex,
  HStack,
  Select,
  Spinner,
  Switch,
  Text,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  farmMapApi,
  type MapSector,
  type NdviConfig,
  type NdviDate,
  type NdviStat,
} from '@agri/api-client/farmMapApi';
import {
  latestChange,
  legendGradient,
  MIN_VALID_FRACTION,
  ndviClass,
  usableStats,
} from '@/app/lib/farmMap/ndvi';

export interface NdviOverlay {
  sectorId: number;
  date: string;
  url: string;
}

interface Props {
  sector: MapSector;
  overlay: NdviOverlay | null;
  onOverlay: (o: NdviOverlay | null) => void;
}

type Load = 'idle' | 'loading' | 'ready' | 'off' | 'error';

let configPromise: Promise<NdviConfig> | null = null;
const loadConfig = () =>
  (configPromise ??= farmMapApi.ndviConfig().catch((e) => {
    configPromise = null;
    throw e;
  }));

const errorCode = (e: unknown): string =>
  (e as { response?: { data?: { code?: string } } })?.response?.data?.code ??
  'error';

function Sparkline({ series }: { series: NdviStat[] }) {
  const stroke = useColorModeValue('#2f855a', '#68d391');
  const grid = useColorModeValue('#e2e8f0', '#4a5568');
  if (series.length < 2) return null;
  const W = 240;
  const H = 56;
  const t0 = Date.parse(series[0]!.date);
  const t1 = Date.parse(series[series.length - 1]!.date);
  const x = (d: string) =>
    ((Date.parse(d) - t0) / (t1 - t0 || 1)) * (W - 8) + 4;
  const y = (v: number) => H - 4 - ((v + 0.2) / 1.2) * (H - 8);
  const pts = series.map((s) => `${x(s.date)},${y(s.mean)}`).join(' ');
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-hidden="true">
      {[0, 0.4, 0.8].map((g) => (
        <line
          key={g}
          x1={0}
          x2={W}
          y1={y(g)}
          y2={y(g)}
          stroke={grid}
          strokeWidth={1}
        />
      ))}
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth={2} />
      {series.map((s) => (
        <circle
          key={s.date}
          cx={x(s.date)}
          cy={y(s.mean)}
          r={2.5}
          fill={stroke}
        />
      ))}
    </svg>
  );
}

export default function SectorNdviPanel({ sector, overlay, onOverlay }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const border = useColorModeValue('gray.200', 'gray.600');
  const muted = useColorModeValue('gray.600', 'gray.400');
  const [config, setConfig] = useState<NdviConfig | null>(null);
  const [state, setState] = useState<Load>('idle');
  const [errCode, setErrCode] = useState('');
  const [dates, setDates] = useState<NdviDate[]>([]);
  const [series, setSeries] = useState<NdviStat[]>([]);
  const [date, setDate] = useState('');
  const [imgLoading, setImgLoading] = useState(false);
  const hasShape = !!sector.geometry;
  const showing = overlay?.sectorId === sector.id;

  useEffect(() => {
    let alive = true;
    setDates([]);
    setSeries([]);
    setDate('');
    if (!hasShape) return;
    setState('loading');
    loadConfig()
      .then(async (cfg) => {
        if (!alive) return;
        setConfig(cfg);
        if (!cfg.configured) {
          setState('off');
          return;
        }
        const [d, s] = await Promise.all([
          farmMapApi.ndviDates(sector.id),
          farmMapApi.ndviStats(sector.id),
        ]);
        if (!alive) return;
        setDates(d);
        setSeries(s);
        setDate(d[0]?.date ?? '');
        setState('ready');
      })
      .catch((e) => {
        if (!alive) return;
        setErrCode(errorCode(e));
        setState(errorCode(e) === 'not_configured' ? 'off' : 'error');
      });
    return () => {
      alive = false;
    };
  }, [sector.id, hasShape]);

  const show = async (d: string) => {
    setImgLoading(true);
    try {
      const blob = await farmMapApi.ndviImage(sector.id, d);
      onOverlay({
        sectorId: sector.id,
        date: d,
        url: URL.createObjectURL(blob),
      });
    } catch (e) {
      setErrCode(errorCode(e));
      onOverlay(null);
    } finally {
      setImgLoading(false);
    }
  };

  const latest = useMemo(() => {
    const ok = usableStats(series);
    return ok.length ? ok[ok.length - 1]! : null;
  }, [series]);
  const change = useMemo(() => latestChange(series), [series]);
  const fmtDate = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  return (
    <Box borderTopWidth="1px" borderColor={border} pt={3} mt={1}>
      <Flex justify="space-between" align="center" mb={2} gap={2}>
        <Text fontSize="sm" fontWeight={600}>
          {t('misc.map.ndvi.title')}
        </Text>
        {state === 'loading' ? <Spinner size="xs" /> : null}
      </Flex>

      {!hasShape ? (
        <Text fontSize="xs" color={muted}>
          {t('misc.map.ndvi.needShape')}
        </Text>
      ) : state === 'off' ? (
        <Text fontSize="xs" color={muted}>
          {t('misc.map.ndvi.notConfigured')}
        </Text>
      ) : state === 'error' ? (
        <Text fontSize="xs" color="red.500">
          {t(
            errCode === 'rate_limit'
              ? 'misc.map.ndvi.rateLimited'
              : 'misc.map.ndvi.loadError'
          )}
        </Text>
      ) : state === 'ready' && !dates.length ? (
        <Text fontSize="xs" color={muted}>
          {t('misc.map.ndvi.noImagery')}
        </Text>
      ) : state === 'ready' ? (
        <>
          {latest ? (
            <HStack spacing={3} mb={1} align="baseline" flexWrap="wrap">
              <Text fontSize="2xl" fontWeight={700} lineHeight={1}>
                {latest.mean.toFixed(2)}
              </Text>
              <Text fontSize="sm">
                {t(`misc.map.ndvi.class.${ndviClass(latest.mean)}`)}
              </Text>
              {change ? (
                <Tooltip
                  hasArrow
                  label={t('misc.map.ndvi.changeSince', {
                    date: fmtDate(change.from.date),
                  })}
                >
                  <Text
                    fontSize="sm"
                    fontWeight={600}
                    color={
                      change.delta > 0.02
                        ? 'green.500'
                        : change.delta < -0.02
                          ? 'orange.500'
                          : muted
                    }
                  >
                    {change.delta > 0 ? '+' : ''}
                    {change.delta.toFixed(2)}
                  </Text>
                </Tooltip>
              ) : null}
            </HStack>
          ) : null}
          {latest ? (
            <Text fontSize="xs" color={muted} mb={2}>
              {t('misc.map.ndvi.latestOn', {
                date: fmtDate(latest.date),
                clear: Math.round(latest.valid_fraction * 100),
              })}
            </Text>
          ) : (
            <Text fontSize="xs" color={muted} mb={2}>
              {t('misc.map.ndvi.noClearDate', {
                pct: Math.round(MIN_VALID_FRACTION * 100),
              })}
            </Text>
          )}

          <Box maxW="320px">
            <Sparkline series={usableStats(series)} />
          </Box>

          <Flex gap={2} align="center" mt={2} flexWrap="wrap">
            <Select
              size="xs"
              maxW="210px"
              value={date}
              onChange={(e) => {
                const d = e.target.value;
                setDate(d);
                // Overlay on: swap the image for the newly picked date.
                if (showing && d) void show(d);
              }}
              aria-label={t('misc.map.ndvi.date')}
            >
              {dates.map((d) => (
                <option key={d.date} value={d.date}>
                  {fmtDate(d.date)} ·{' '}
                  {t('misc.map.ndvi.clouds', {
                    pct: Math.round(d.cloud_cover),
                  })}
                </option>
              ))}
            </Select>
            <HStack spacing={2}>
              <Switch
                size="sm"
                isChecked={showing}
                isDisabled={!date || imgLoading}
                onChange={(e) =>
                  e.target.checked ? void show(date) : onOverlay(null)
                }
                id={`ndvi-overlay-${sector.id}`}
              />
              <Text
                as="label"
                htmlFor={`ndvi-overlay-${sector.id}`}
                fontSize="xs"
              >
                {t('misc.map.ndvi.showOnMap')}
              </Text>
              {imgLoading ? <Spinner size="xs" /> : null}
            </HStack>
          </Flex>

          {config?.legend.length ? (
            <Box mt={2}>
              <Box
                h="8px"
                borderRadius="sm"
                bgImage={legendGradient(config.legend)}
              />
              <Flex justify="space-between" fontSize="10px" color={muted}>
                <Text>{t('misc.map.ndvi.legendLow')}</Text>
                <Text>{t('misc.map.ndvi.legendHigh')}</Text>
              </Flex>
            </Box>
          ) : null}

          <Text fontSize="10px" color={muted} mt={2}>
            {t('misc.map.ndvi.disclaimer')} {config?.source}
          </Text>
        </>
      ) : null}
    </Box>
  );
}
