'use client';

/**
 * "Conseil" for the selected sector (agri-api#459 phase 3,
 * `GET /farm-map/sectors/{id}/insights`):
 *
 * - FAO-56 water balance: depletion gauge (Dr against RAW / TAW), status chip,
 *   the Kc used and where it came from, the 14-day Dr / rain / irrigation chart
 *   and the balance's starting assumption;
 * - irrigation recommendation (message, volume, duration, rain next 48 h);
 * - vegetation reading (status chip, the API's label + message, NDVI value and
 *   weekly trend, soil moisture).
 *
 * Laid out as tabs: Irrigation (gauge, recommendation, chart, assumption),
 * Végétation (NDVI × soil card) and, when the caller passes it, Satellite (the
 * NDVI panel, mounted only once that tab is first opened). One insights
 * request feeds the first two tabs; the chosen tab is remembered for the rest
 * of the page session.
 *
 * Agronomy wording (label, message, assumption) comes from the API in the UI
 * language (`?lang=`, refetched when the locale changes) and is shown as-is;
 * older servers ignore `lang` and answer in French. Any missing number shows
 * as "—".
 */

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Badge,
  Box,
  Flex,
  HStack,
  IconButton,
  SimpleGrid,
  Spinner,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react';
import { RepeatIcon } from '@chakra-ui/icons';
import {
  farmMapApi,
  type SectorInsights,
  type VegetationInsight,
} from '@agri/api-client/farmMapApi';
import {
  balanceChartRows,
  DASH,
  depletionGauge,
  fmtNum,
  fmtSigned,
  type InsightTab,
  insightsLang,
  insightsTextDir,
  insightTabIndex,
  isNum,
  isStableTrend,
  KC_SOURCES,
  knownCode,
  UNAVAILABLE_REASONS,
  VEGETATION_STATUSES,
  visibleInsightTabs,
  vegetationScheme,
  WATER_STATUS_COLOR,
  WATER_STATUSES,
  waterStatusScheme,
} from '@/app/lib/farmMap/insights';
import WaterBalanceChart from './WaterBalanceChart';

interface Props {
  sectorId: number;
  /** Content of the "Satellite" tab (the NDVI panel); no tab when omitted.
   *  Not mounted, so not fetched, until the tab is first opened. */
  satellite?: ReactNode;
}

type Load = 'loading' | 'ready' | 'error';

/** Tab picked last, kept for the rest of the page session (the panel
 *  unmounts with the map modal). */
let rememberedTab: InsightTab = 'irrigation';

function Stat({ label, value }: { label: string; value: string }) {
  const muted = useColorModeValue('gray.600', 'gray.400');
  return (
    <Box minW={0}>
      <Text fontSize="10px" color={muted} noOfLines={1}>
        {label}
      </Text>
      {/* Numbers + units stay "32.1 mm" in Arabic too. */}
      <Text fontSize="sm" fontWeight={600}>
        <bdi dir="ltr">{value}</bdi>
      </Text>
    </Box>
  );
}

function VegetationCard({
  veg,
  dir,
}: {
  veg: VegetationInsight | null;
  dir: 'ltr' | 'rtl' | 'auto';
}) {
  const t = useTranslations();
  const muted = useColorModeValue('gray.600', 'gray.400');
  const border = useColorModeValue('gray.200', 'gray.600');
  if (!veg) {
    return (
      <Text fontSize="xs" color={muted}>
        {t('misc.map.insights.noVegetation')}
      </Text>
    );
  }
  const code = knownCode(veg.status, VEGETATION_STATUSES);
  const confidence = knownCode(veg.confidence, ['high', 'medium', 'low']);
  const trend = veg.ndvi?.trend_per_week;
  return (
    <Box borderWidth="1px" borderColor={border} borderRadius="md" p={2}>
      <HStack spacing={2} mb={1} flexWrap="wrap">
        <Badge colorScheme={vegetationScheme(veg.status)}>
          {code
            ? t(`misc.map.insights.vegStatus.${code}`)
            : veg.label || veg.status}
        </Badge>
        {veg.label ? (
          <Text fontSize="sm" fontWeight={600} dir={dir}>
            {veg.label}
          </Text>
        ) : null}
        {confidence ? (
          <Text fontSize="10px" color={muted}>
            {t(`misc.map.insights.confidence.${confidence}`)}
          </Text>
        ) : null}
      </HStack>
      {veg.message ? (
        <Text fontSize="xs" mb={2} dir={dir}>
          {veg.message}
        </Text>
      ) : null}
      <SimpleGrid columns={3} spacing={2}>
        <Stat
          label={t('misc.map.insights.ndvi')}
          value={fmtNum(veg.ndvi?.mean, 2)}
        />
        <Stat
          label={t('misc.map.insights.ndviTrend')}
          value={
            isStableTrend(trend)
              ? t('misc.map.insights.trendStable')
              : isNum(trend)
                ? t('misc.map.insights.perWeek', { value: fmtSigned(trend, 2) })
                : DASH
          }
        />
        <Box minW={0}>
          <Stat
            label={t('misc.map.insights.soilMoisture')}
            value={fmtNum(veg.soil_moisture_pct, 0, '%')}
          />
          {isNum(veg.critical_moisture_pct) ? (
            <Text fontSize="10px" color={muted}>
              {t('misc.map.insights.criticalAt', {
                value: fmtNum(veg.critical_moisture_pct, 0, '%'),
              })}
            </Text>
          ) : null}
        </Box>
      </SimpleGrid>
    </Box>
  );
}

export default function SectorInsightsPanel({ sectorId, satellite }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const lang = insightsLang(locale);
  const border = useColorModeValue('gray.200', 'gray.600');
  const muted = useColorModeValue('gray.600', 'gray.400');
  const track = useColorModeValue('gray.100', 'gray.700');
  const [nonce, setNonce] = useState(0);
  const key = `${sectorId}:${lang}:${nonce}`;
  /** Last answer and the request it belongs to ("loading" is derived). */
  const [result, setResult] = useState<{
    key: string;
    data: SectorInsights | null;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    farmMapApi
      .sectorInsights(sectorId, lang)
      .then((d) => alive && setResult({ key, data: d }))
      .catch(() => alive && setResult({ key, data: null }));
    return () => {
      alive = false;
    };
  }, [sectorId, lang, key]);

  const state: Load =
    result?.key !== key ? 'loading' : result.data ? 'ready' : 'error';
  // Keep the previous sector's numbers off screen while the next loads.
  const data =
    result && result.key.split(':')[0] === String(sectorId)
      ? result.data
      : null;

  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  const fmtDate = (d: string | null | undefined) =>
    d
      ? new Date(`${d.slice(0, 10)}T12:00:00Z`).toLocaleDateString(locale, {
          day: 'numeric',
          month: 'short',
        })
      : DASH;

  const wb = data?.water_balance ?? null;
  const rows = useMemo(() => balanceChartRows(wb?.days ?? []), [wb]);
  const gauge = wb?.available ? depletionGauge(wb) : null;
  const status = knownCode(wb?.status, WATER_STATUSES);
  const reason = knownCode(wb?.reason, UNAVAILABLE_REASONS) ?? 'other';
  const kcSource = knownCode(data?.kc.source, KC_SOURCES);
  const rec = data?.recommendation ?? null;
  const textDir = insightsTextDir(data?.lang);

  const tabs = visibleInsightTabs(satellite != null);
  const [tab, setTab] = useState<InsightTab>(rememberedTab);
  const [satelliteSeen, setSatelliteSeen] = useState(tab === 'satellite');
  const tabIndex = insightTabIndex(tabs, tab);
  const onTabChange = (i: number) => {
    const next = tabs[i] ?? 'irrigation';
    rememberedTab = next;
    setTab(next);
    if (next === 'satellite') setSatelliteSeen(true);
  };

  // Shared by the two insights tabs (the header spinner covers loading).
  const placeholder: ReactNode =
    state === 'error' ? (
      <Text fontSize="xs" color="red.500">
        {t('misc.map.insights.loadError')}
      </Text>
    ) : null;

  return (
    <Box
      id="sector-insights-panel"
      borderTopWidth="1px"
      borderColor={border}
      pt={3}
      mt={1}
    >
      <Flex justify="space-between" align="center" mb={2} gap={2}>
        <HStack spacing={2}>
          <Text fontSize="sm" fontWeight={600}>
            {t('misc.map.insights.title')}
          </Text>
          {data?.date ? (
            <Text fontSize="10px" color={muted}>
              {t('misc.map.insights.asOf', { date: fmtDate(data.date) })}
            </Text>
          ) : null}
        </HStack>
        {state === 'loading' ? (
          <Spinner size="xs" />
        ) : (
          <IconButton
            size="xs"
            variant="ghost"
            icon={<RepeatIcon />}
            aria-label={t('misc.map.insights.refresh')}
            onClick={refresh}
          />
        )}
      </Flex>

      <Tabs
        size="sm"
        colorScheme="brand"
        variant="enclosed"
        index={tabIndex}
        onChange={onTabChange}
      >
        <TabList>
          {tabs.map((k) => (
            <Tab key={k} fontSize="xs" px={2}>
              {t(`misc.map.insights.tabs.${k}`)}
            </Tab>
          ))}
        </TabList>
        <TabPanels>
          <TabPanel px={0} pb={0} id="sector-insights-irrigation">
            {placeholder ??
              (data && wb ? (
                <>
                  <Text fontSize="xs" fontWeight={600} mb={1}>
                    {t('misc.map.insights.waterBalance')}
                  </Text>
                  {!wb.available ? (
                    <Text fontSize="xs" color={muted} mb={2}>
                      {t('misc.map.insights.unavailable', {
                        reason: t(`misc.map.insights.reason.${reason}`),
                      })}
                    </Text>
                  ) : (
                    <>
                      <HStack spacing={2} mb={2} flexWrap="wrap">
                        <Badge colorScheme={waterStatusScheme(wb.status)}>
                          {t(`misc.map.insights.status.${status ?? 'unknown'}`)}
                        </Badge>
                        <Text fontSize="xs">
                          {t('misc.map.insights.kc', {
                            value: fmtNum(data.kc.value, 2),
                          })}
                          {kcSource
                            ? ` · ${t(`misc.map.insights.kcSource.${kcSource}`)}`
                            : ''}
                          {data.kc.period_name
                            ? ` · ${data.kc.period_name}`
                            : ''}
                        </Text>
                      </HStack>

                      {gauge ? (
                        <Box mb={1}>
                          <Box
                            position="relative"
                            h="12px"
                            bg={track}
                            borderRadius="sm"
                            overflow="hidden"
                            role="meter"
                            aria-label={t('misc.map.insights.gaugeLabel')}
                            aria-valuemin={0}
                            aria-valuemax={
                              isNum(wb.taw_mm) ? wb.taw_mm : undefined
                            }
                            aria-valuenow={
                              isNum(wb.dr_mm) ? wb.dr_mm : undefined
                            }
                          >
                            <Box
                              position="absolute"
                              insetY={0}
                              insetStart={0}
                              w={`${gauge.fillPct}%`}
                              bg={
                                status ? WATER_STATUS_COLOR[status] : 'gray.400'
                              }
                            />
                            <Box
                              position="absolute"
                              insetY={0}
                              insetStart={`${gauge.soonPct}%`}
                              w="1px"
                              bg="orange.600"
                              opacity={0.7}
                            />
                            <Box
                              position="absolute"
                              insetY={0}
                              insetStart={`${gauge.rawPct}%`}
                              w="2px"
                              bg="red.600"
                            />
                          </Box>
                          <Text fontSize="10px" color={muted} mt="2px">
                            {t('misc.map.insights.depletionPct', {
                              pct: fmtNum(wb.depletion_pct, 0, '%'),
                            })}
                          </Text>
                        </Box>
                      ) : null}

                      <SimpleGrid columns={3} spacing={2} mb={2}>
                        <Stat
                          label={t('misc.map.insights.dr')}
                          value={fmtNum(wb.dr_mm, 1, 'mm')}
                        />
                        <Tooltip
                          hasArrow
                          label={t('misc.map.insights.rawHint')}
                        >
                          <Box>
                            <Stat
                              label={t('misc.map.insights.raw')}
                              value={fmtNum(wb.raw_mm, 1, 'mm')}
                            />
                          </Box>
                        </Tooltip>
                        <Tooltip
                          hasArrow
                          label={t('misc.map.insights.tawHint')}
                        >
                          <Box>
                            <Stat
                              label={t('misc.map.insights.taw')}
                              value={fmtNum(wb.taw_mm, 1, 'mm')}
                            />
                          </Box>
                        </Tooltip>
                      </SimpleGrid>
                    </>
                  )}

                  {rec ? (
                    <Box
                      borderWidth="1px"
                      borderColor={border}
                      borderRadius="md"
                      p={2}
                      mb={2}
                    >
                      <Text fontSize="xs" fontWeight={600} mb={1}>
                        {t('misc.map.insights.recommendation')}
                      </Text>
                      {rec.message ? (
                        <Text fontSize="sm" mb={1} dir={textDir}>
                          {rec.message}
                        </Text>
                      ) : null}
                      <SimpleGrid columns={3} spacing={2}>
                        {isNum(rec.volume_m3) ? (
                          <Stat
                            label={t('misc.map.insights.volume')}
                            value={fmtNum(rec.volume_m3, 1, 'm³')}
                          />
                        ) : null}
                        {isNum(rec.duration_min) ? (
                          <Stat
                            label={t('misc.map.insights.duration')}
                            value={fmtNum(rec.duration_min, 0, 'min')}
                          />
                        ) : null}
                        <Stat
                          label={t('misc.map.insights.rain48h')}
                          value={fmtNum(rec.rain_next_48h_mm, 1, 'mm')}
                        />
                      </SimpleGrid>
                    </Box>
                  ) : null}

                  {wb.available && rows.length >= 2 ? (
                    <Box mb={2}>
                      <Text fontSize="xs" fontWeight={600} mb={1}>
                        {t('misc.map.insights.chartTitle')}
                      </Text>
                      <WaterBalanceChart rows={rows} rawMm={wb.raw_mm} />
                    </Box>
                  ) : null}
                  {wb.assumption ? (
                    <Text fontSize="10px" color={muted} mt={2} dir={textDir}>
                      {wb.assumption}
                    </Text>
                  ) : null}
                </>
              ) : null)}
          </TabPanel>
          <TabPanel px={0} pb={0} id="sector-insights-vegetation">
            {placeholder ??
              (data ? (
                <VegetationCard veg={data.vegetation} dir={textDir} />
              ) : null)}
          </TabPanel>
          {satellite != null ? (
            <TabPanel px={0} pb={0} id="sector-insights-satellite">
              {satelliteSeen ? satellite : null}
            </TabPanel>
          ) : null}
        </TabPanels>
      </Tabs>
    </Box>
  );
}
