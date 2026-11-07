'use client';

/**
 * Satellite indices for the selected sector (agri-api#459 phase 2).
 *
 * - Index selector: NDVI (vigour), NDMI (canopy water), NDRE (red-edge
 *   chlorophyll), false colour (picture only, no statistics).
 * - Acquisition date with Previous / Next, cloud-cover filter, opacity, and a
 *   valid-pixel indicator for the chosen date.
 * - Latest clear-sky mean + class, change since the previous clear date,
 *   persistent-decline warning, low / medium / high area classes, history.
 * - Compare two dates side by side (images + mean and class change).
 *
 * Indices are vigour / water / chlorophyll proxies from 10–20 m pixels: not
 * plant density, not where irrigation water went. Dates with < 60 % clear
 * pixels are shown as such instead of producing a misleading number.
 */

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Image,
  Select,
  SimpleGrid,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Spinner,
  Switch,
  Text,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import {
  farmMapApi,
  type MapSector,
  type NdviConfig,
  type NdviDate,
  type NdviStat,
  type SatImageKind,
  type SatIndex,
} from '@agri/api-client/farmMapApi';
import {
  latestChange,
  legendGradient,
  MIN_VALID_FRACTION,
  ndviClass,
  persistentDecline,
  statAt,
  usableStats,
} from '@/app/lib/farmMap/ndvi';

export interface NdviOverlay {
  sectorId: number;
  date: string;
  kind: SatImageKind;
  url: string;
  opacity: number;
}

interface Props {
  sector: MapSector;
  overlay: NdviOverlay | null;
  onOverlay: (o: NdviOverlay | null) => void;
}

type Load = 'idle' | 'loading' | 'ready' | 'off' | 'error';

const KINDS: SatImageKind[] = ['ndvi', 'ndmi', 'ndre', 'false_color'];
const isIndex = (k: SatImageKind): k is SatIndex => k !== 'false_color';

let configPromise: Promise<NdviConfig> | null = null;
const loadConfig = () =>
  (configPromise ??= farmMapApi.ndviConfig().catch((e) => {
    configPromise = null;
    throw e;
  }));

const errorCode = (e: unknown): string =>
  (e as { response?: { data?: { code?: string } } })?.response?.data?.code ??
  'error';

const pct = (v: number) => `${Math.round(v * 100)} %`;

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
  const y = (v: number) => H - 4 - ((v + 0.4) / 1.4) * (H - 8);
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

function ClassBar({
  classes,
}: {
  classes: { low: number; medium: number; high: number };
}) {
  const t = useTranslations();
  const parts = [
    { key: 'low', v: classes.low, color: '#d73027' },
    { key: 'medium', v: classes.medium, color: '#fee08c' },
    { key: 'high', v: classes.high, color: '#1a9850' },
  ] as const;
  return (
    <Box>
      <Flex h="10px" borderRadius="sm" overflow="hidden">
        {parts.map((p) => (
          <Box key={p.key} w={`${p.v * 100}%`} bg={p.color} />
        ))}
      </Flex>
      <Flex justify="space-between" fontSize="10px" mt="2px" gap={2}>
        {parts.map((p) => (
          <Text key={p.key}>
            {t(`misc.map.ndvi.areaClass.${p.key}`)} {pct(p.v)}
          </Text>
        ))}
      </Flex>
    </Box>
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
  const [kind, setKind] = useState<SatImageKind>('ndvi');
  const [maxCloud, setMaxCloud] = useState(40);
  const [dates, setDates] = useState<NdviDate[]>([]);
  const [series, setSeries] = useState<NdviStat[]>([]);
  const [date, setDate] = useState('');
  const [compareDate, setCompareDate] = useState('');
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [imgLoading, setImgLoading] = useState(false);
  const [opacity, setOpacity] = useState(0.85);
  const hasShape = !!sector.geometry;
  const showing = overlay?.sectorId === sector.id;
  const statsKind: SatIndex = isIndex(kind) ? kind : 'ndvi';

  // Config + dates (refetched when the cloud filter changes).
  useEffect(() => {
    let alive = true;
    if (!hasShape) return;
    setState((s) => (s === 'ready' ? s : 'loading'));
    loadConfig()
      .then(async (cfg) => {
        if (!alive) return;
        setConfig(cfg);
        if (!cfg.configured) {
          setState('off');
          return;
        }
        const d = await farmMapApi.ndviDates(sector.id, 120, maxCloud);
        if (!alive) return;
        setDates(d);
        setDate((cur) =>
          cur && d.some((x) => x.date === cur) ? cur : (d[0]?.date ?? '')
        );
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
  }, [sector.id, hasShape, maxCloud]);

  // Statistics for the chosen index.
  useEffect(() => {
    let alive = true;
    if (state !== 'ready' || !isIndex(kind)) return;
    farmMapApi
      .ndviStats(sector.id, 120, kind)
      .then((s) => alive && setSeries(s))
      .catch((e) => alive && setErrCode(errorCode(e)));
    return () => {
      alive = false;
    };
  }, [sector.id, kind, state]);

  // Thumbnails for the comparison (current date vs comparison date).
  useEffect(() => {
    let alive = true;
    const urls: string[] = [];
    setThumbs({});
    if (!compareDate || !date) return;
    Promise.all(
      [date, compareDate].map((d) =>
        farmMapApi.ndviImage(sector.id, d, kind).then((b) => {
          const u = URL.createObjectURL(b);
          urls.push(u);
          return [d, u] as const;
        })
      )
    )
      .then((pairs) => alive && setThumbs(Object.fromEntries(pairs)))
      .catch((e) => alive && setErrCode(errorCode(e)));
    return () => {
      alive = false;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [sector.id, kind, date, compareDate]);

  const show = async (d: string, k: SatImageKind, o: number) => {
    setImgLoading(true);
    try {
      const blob = await farmMapApi.ndviImage(sector.id, d, k);
      onOverlay({
        sectorId: sector.id,
        date: d,
        kind: k,
        url: URL.createObjectURL(blob),
        opacity: o,
      });
    } catch (e) {
      setErrCode(errorCode(e));
      onOverlay(null);
    } finally {
      setImgLoading(false);
    }
  };

  const pickDate = (d: string) => {
    setDate(d);
    if (showing && d) void show(d, kind, opacity);
  };
  const pickKind = (k: SatImageKind) => {
    setKind(k);
    setSeries([]);
    if (showing && date) void show(date, k, opacity);
  };

  const idx = dates.findIndex((d) => d.date === date);
  const latest = useMemo(() => {
    const ok = usableStats(series);
    return ok.length ? ok[ok.length - 1]! : null;
  }, [series]);
  const change = useMemo(() => latestChange(series), [series]);
  const decline = useMemo(() => persistentDecline(series), [series]);
  const atDate = statAt(series, date);
  const atCompare = compareDate ? statAt(series, compareDate) : null;
  const indexInfo = config?.indexes?.find((i) => i.id === statsKind);
  const legendStops = indexInfo?.legend ?? config?.legend ?? [];
  const fmtDate = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  const kindLabel = (k: SatImageKind) => t(`misc.map.ndvi.kinds.${k}`);

  return (
    <Box
      id="sector-ndvi-panel"
      borderTopWidth="1px"
      borderColor={border}
      pt={3}
      mt={1}
    >
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
      ) : state === 'ready' ? (
        <>
          <Flex gap={2} align="center" mb={2} flexWrap="wrap">
            <Select
              size="xs"
              maxW="210px"
              value={kind}
              onChange={(e) => pickKind(e.target.value as SatImageKind)}
              aria-label={t('misc.map.ndvi.index')}
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {kindLabel(k)}
                </option>
              ))}
            </Select>
            <Text fontSize="10px" color={muted} flex="1" minW="120px">
              {t(`misc.map.ndvi.kindUse.${kind}`)}
            </Text>
          </Flex>

          {!dates.length ? (
            <Text fontSize="xs" color={muted} mb={2}>
              {t('misc.map.ndvi.noImagery', { pct: maxCloud })}
            </Text>
          ) : null}

          {isIndex(kind) && latest ? (
            <>
              <HStack spacing={3} mb={1} align="baseline" flexWrap="wrap">
                <Text fontSize="2xl" fontWeight={700} lineHeight={1}>
                  {latest.mean.toFixed(2)}
                </Text>
                {kind === 'ndvi' ? (
                  <Text fontSize="sm">
                    {t(`misc.map.ndvi.class.${ndviClass(latest.mean)}`)}
                  </Text>
                ) : null}
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
                {decline ? (
                  <Tooltip
                    hasArrow
                    label={t('misc.map.ndvi.declineHint', {
                      baseline: decline.baseline.toFixed(2),
                    })}
                  >
                    <Badge colorScheme="orange">
                      {t('misc.map.ndvi.decline')}
                    </Badge>
                  </Tooltip>
                ) : null}
              </HStack>
              <Text fontSize="xs" color={muted} mb={2}>
                {t('misc.map.ndvi.latestOn', {
                  date: fmtDate(latest.date),
                  clear: Math.round(latest.valid_fraction * 100),
                })}
              </Text>
            </>
          ) : isIndex(kind) && series.length ? (
            <Text fontSize="xs" color={muted} mb={2}>
              {t('misc.map.ndvi.noClearDate', {
                pct: Math.round(MIN_VALID_FRACTION * 100),
              })}
            </Text>
          ) : null}

          {isIndex(kind) ? (
            <Box maxW="320px">
              <Sparkline series={usableStats(series)} />
            </Box>
          ) : null}

          {dates.length ? (
            <>
              <Flex gap={1} align="center" mt={2} flexWrap="wrap">
                <IconButton
                  size="xs"
                  variant="outline"
                  aria-label={t('misc.map.ndvi.previous')}
                  icon={<ChevronLeftIcon />}
                  isDisabled={idx < 0 || idx >= dates.length - 1}
                  onClick={() => pickDate(dates[idx + 1]!.date)}
                />
                <Select
                  size="xs"
                  maxW="200px"
                  value={date}
                  onChange={(e) => pickDate(e.target.value)}
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
                <IconButton
                  size="xs"
                  variant="outline"
                  aria-label={t('misc.map.ndvi.next')}
                  icon={<ChevronRightIcon />}
                  isDisabled={idx <= 0}
                  onClick={() => pickDate(dates[idx - 1]!.date)}
                />
              </Flex>

              {isIndex(kind) ? (
                atDate ? (
                  <Box mt={2}>
                    <Text fontSize="xs" color={muted} mb={1}>
                      {t('misc.map.ndvi.atDate', {
                        mean: atDate.mean.toFixed(2),
                        valid: Math.round(atDate.valid_fraction * 100),
                      })}
                      {atDate.valid_fraction < MIN_VALID_FRACTION
                        ? ` · ${t('misc.map.ndvi.lowValid')}`
                        : ''}
                    </Text>
                    {atDate.classes ? (
                      <ClassBar classes={atDate.classes} />
                    ) : null}
                  </Box>
                ) : series.length ? (
                  <Text fontSize="xs" color={muted} mt={2}>
                    {t('misc.map.ndvi.noStatForDate')}
                  </Text>
                ) : null
              ) : null}

              <HStack spacing={2} mt={2}>
                <Switch
                  size="sm"
                  isChecked={showing}
                  isDisabled={!date || imgLoading}
                  onChange={(e) =>
                    e.target.checked
                      ? void show(date, kind, opacity)
                      : onOverlay(null)
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
              {showing ? (
                <Flex align="center" gap={3} mt={1} maxW="320px">
                  <Text fontSize="xs" whiteSpace="nowrap">
                    {t('misc.map.layers.opacity')}
                  </Text>
                  <Slider
                    size="sm"
                    min={0.2}
                    max={1}
                    step={0.05}
                    value={opacity}
                    onChange={(v) => {
                      setOpacity(v);
                      if (overlay) onOverlay({ ...overlay, opacity: v });
                    }}
                    aria-label={t('misc.map.layers.opacity')}
                  >
                    <SliderTrack>
                      <SliderFilledTrack bg="green.500" />
                    </SliderTrack>
                    <SliderThumb />
                  </Slider>
                </Flex>
              ) : null}
            </>
          ) : null}

          <Flex align="center" gap={3} mt={2} maxW="320px">
            <Text fontSize="xs" whiteSpace="nowrap">
              {t('misc.map.ndvi.maxCloud', { pct: maxCloud })}
            </Text>
            <Slider
              size="sm"
              min={10}
              max={80}
              step={10}
              value={maxCloud}
              onChange={setMaxCloud}
              aria-label={t('misc.map.ndvi.maxCloudLabel')}
            >
              <SliderTrack>
                <SliderFilledTrack bg="blue.400" />
              </SliderTrack>
              <SliderThumb />
            </Slider>
          </Flex>

          {dates.length > 1 ? (
            <Box mt={3}>
              <Flex gap={2} align="center" flexWrap="wrap">
                <Text fontSize="xs" fontWeight={600}>
                  {t('misc.map.ndvi.compare')}
                </Text>
                <Select
                  size="xs"
                  maxW="200px"
                  value={compareDate}
                  onChange={(e) => setCompareDate(e.target.value)}
                  aria-label={t('misc.map.ndvi.compare')}
                >
                  <option value="">{t('misc.map.ndvi.compareNone')}</option>
                  {dates
                    .filter((d) => d.date !== date)
                    .map((d) => (
                      <option key={d.date} value={d.date}>
                        {fmtDate(d.date)}
                      </option>
                    ))}
                </Select>
                {compareDate ? (
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setCompareDate('')}
                  >
                    {t('misc.map.ndvi.compareClose')}
                  </Button>
                ) : null}
              </Flex>
              {compareDate ? (
                <>
                  <SimpleGrid columns={2} spacing={2} mt={2} maxW="360px">
                    {[compareDate, date].map((d) => (
                      <Box key={d}>
                        <Text fontSize="10px" color={muted} mb="2px">
                          {fmtDate(d)}
                        </Text>
                        <Box
                          borderWidth="1px"
                          borderColor={border}
                          borderRadius="sm"
                          h="110px"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          bg="blackAlpha.50"
                        >
                          {thumbs[d] ? (
                            <Image
                              src={thumbs[d]}
                              alt={`${kindLabel(kind)} ${fmtDate(d)}`}
                              maxH="108px"
                              objectFit="contain"
                              style={{ imageRendering: 'pixelated' }}
                            />
                          ) : (
                            <Spinner size="sm" />
                          )}
                        </Box>
                      </Box>
                    ))}
                  </SimpleGrid>
                  {isIndex(kind) && atDate && atCompare ? (
                    <Text fontSize="xs" mt={1}>
                      {t('misc.map.ndvi.compareDelta', {
                        delta: `${atDate.mean - atCompare.mean >= 0 ? '+' : ''}${(atDate.mean - atCompare.mean).toFixed(2)}`,
                        from: fmtDate(compareDate),
                      })}
                      {atDate.classes && atCompare.classes
                        ? ` · ${t('misc.map.ndvi.compareHigh', {
                            delta: `${atDate.classes.high - atCompare.classes.high >= 0 ? '+' : ''}${Math.round((atDate.classes.high - atCompare.classes.high) * 100)}`,
                          })}`
                        : ''}
                    </Text>
                  ) : null}
                </>
              ) : null}
            </Box>
          ) : null}

          {isIndex(kind) && legendStops.length ? (
            <Box mt={3} maxW="360px">
              <Box
                h="8px"
                borderRadius="sm"
                bgImage={legendGradient(legendStops)}
              />
              <Flex justify="space-between" fontSize="10px" color={muted}>
                <Text>{legendStops[0]!.value}</Text>
                <Text>{t(`misc.map.ndvi.legend.${kind}`)}</Text>
                <Text>{legendStops[legendStops.length - 1]!.value}</Text>
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
