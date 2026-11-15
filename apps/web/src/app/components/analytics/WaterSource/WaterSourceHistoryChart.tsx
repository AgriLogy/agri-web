import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  waterLevelApi,
  type WaterHistory,
  type WaterHistoryRange,
  type WaterSource,
} from '@agri/api-client/waterLevelApi';
import { colorForSensor } from '@agri/ui';
import { formatNumber } from '@/app/utils/formatNumber';
import { useChartAxisColors } from '@/app/utils/useChartAxisColors';
import { logOptionalApiFailure } from '@/app/utils/apiClientErrors';

const RANGES: WaterHistoryRange[] = ['24h', '7d', '30d'];
const STROKE = colorForSensor('water_level');

const tickFor = (range: WaterHistoryRange) => (ms: number) => {
  const d = new Date(ms);
  return range === '24h'
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
};

/** Level history over 24 h / 7 d / 30 d, with the alert thresholds drawn. */
const WaterSourceHistoryChart = ({
  source,
  refreshKey,
}: {
  source: WaterSource;
  /** Bumped by the parent after a new reading so the chart refetches. */
  refreshKey: number;
}) => {
  const t = useTranslations('analytics.waterSource');
  const { axis, tickFill, grid } = useChartAxisColors();
  const tooltipBg = useColorModeValue('white', 'gray.700');
  const [range, setRange] = useState<WaterHistoryRange>('24h');
  const [history, setHistory] = useState<WaterHistory | null>(null);

  useEffect(() => {
    let cancelled = false;
    waterLevelApi
      .history(source.id, range)
      .then((h) => !cancelled && setHistory(h))
      .catch((e) => logOptionalApiFailure('WaterSourceHistoryChart', e));
    return () => {
      cancelled = true;
    };
  }, [source.id, range, refreshKey]);

  const rows = useMemo(
    () =>
      (history?.points ?? []).map((p) => ({
        ms: new Date(p.measured_at).getTime(),
        level: p.level_m,
        volume: p.volume_m3,
        fill: p.fill_percent,
      })),
    [history]
  );
  const h = source.max_height_m;
  const at = (pct: number) => (pct / 100) * h;

  return (
    <Box w="100%" minW={0}>
      <Flex justify="space-between" align="center" mb={2} gap={2} wrap="wrap">
        <Text fontSize="sm" fontWeight="semibold">
          {t('historyTitle')}
        </Text>
        <ButtonGroup size="xs" isAttached variant="outline">
          {RANGES.map((r) => (
            <Button
              key={r}
              onClick={() => setRange(r)}
              colorScheme={r === range ? 'blue' : undefined}
              variant={r === range ? 'solid' : 'outline'}
            >
              {t(`range.${r}`)}
            </Button>
          ))}
        </ButtonGroup>
      </Flex>
      {rows.length === 0 ? (
        <Flex h="200px" align="center" justify="center">
          <Text fontSize="sm" color="gray.500">
            {t('noHistory')}
          </Text>
        </Flex>
      ) : (
        <Box h="220px">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={rows}
              margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
            >
              <CartesianGrid stroke={grid} strokeDasharray="3 3" />
              <XAxis
                dataKey="ms"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={tickFor(range)}
                stroke={axis}
                tick={{ fill: tickFill, fontSize: 11 }}
              />
              <YAxis
                domain={[0, h]}
                stroke={axis}
                tick={{ fill: tickFill, fontSize: 11 }}
                tickFormatter={(v: number) => `${formatNumber(v, 1)} m`}
                width={56}
              />
              <ReferenceLine
                y={at(source.critical_pct)}
                stroke="#E53E3E"
                strokeDasharray="4 4"
              />
              <ReferenceLine
                y={at(source.low_warning_pct)}
                stroke="#DD6B20"
                strokeDasharray="4 4"
              />
              <ReferenceLine
                y={at(source.high_pct)}
                stroke="#805AD5"
                strokeDasharray="4 4"
              />
              <Tooltip
                contentStyle={{
                  background: tooltipBg,
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={(ms: number) => new Date(ms).toLocaleString()}
                formatter={(_v, _n, item) => {
                  const p = item.payload as (typeof rows)[number];
                  const vol =
                    p.volume == null
                      ? ''
                      : ` · ${formatNumber(p.volume, 2)} m³`;
                  return [
                    `${formatNumber(p.level, 2)} m · ${formatNumber(p.fill, 1)}%${vol}`,
                    t('level'),
                  ];
                }}
              />
              <Area
                type="monotone"
                dataKey="level"
                stroke={STROKE}
                fill={STROKE}
                fillOpacity={0.2}
                isAnimationActive={false}
                dot={rows.length < 40}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Box>
  );
};

export default WaterSourceHistoryChart;
