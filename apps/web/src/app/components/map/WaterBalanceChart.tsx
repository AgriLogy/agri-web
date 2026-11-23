'use client';

/**
 * 14-day root-zone depletion (Dr) line with rain and irrigation bars and the
 * RAW threshold (agri-api#459 phase 3). Kept apart from the panel so tests can
 * stub recharts out.
 */

import { useTranslations } from 'next-intl';
import { Box, useColorModeValue } from '@chakra-ui/react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BalanceChartRow } from '@/app/lib/farmMap/insights';
import { fmtNum, isNum, shortDay } from '@/app/lib/farmMap/insights';

interface Props {
  rows: BalanceChartRow[];
  rawMm: number | null;
}

export default function WaterBalanceChart({ rows, rawMm }: Props) {
  const t = useTranslations();
  const grid = useColorModeValue('#e2e8f0', '#4a5568');
  const axis = useColorModeValue('#4a5568', '#cbd5e0');
  const tooltipBg = useColorModeValue('#ffffff', '#2d3748');
  if (rows.length < 2) return null;
  return (
    // Time runs left → right in every locale (RTL included).
    <Box h="170px" w="100%" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={rows}
          margin={{ top: 6, right: 6, bottom: 0, left: -18 }}
        >
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDay}
            tick={{ fontSize: 10, fill: axis }}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 10, fill: axis }} width={44} />
          <Tooltip
            labelFormatter={(d) => shortDay(String(d))}
            formatter={(v) => fmtNum(typeof v === 'number' ? v : null, 1)}
            contentStyle={{ fontSize: 11, background: tooltipBg }}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} />
          <Bar
            dataKey="rain"
            name={t('misc.map.insights.chartRain')}
            fill="#4299e1"
            barSize={6}
          />
          <Bar
            dataKey="irrigation"
            name={t('misc.map.insights.chartIrrigation')}
            fill="#38b2ac"
            barSize={6}
          />
          <Line
            dataKey="dr"
            name={t('misc.map.insights.chartDr')}
            stroke="#dd6b20"
            strokeWidth={2}
            dot={{ r: 2 }}
            connectNulls={false}
            type="monotone"
          />
          {isNum(rawMm) ? (
            <ReferenceLine
              y={rawMm}
              stroke="#e53e3e"
              strokeDasharray="4 3"
              label={{
                value: t('misc.map.insights.chartRaw'),
                fontSize: 10,
                fill: '#e53e3e',
                position: 'insideTopRight',
              }}
            />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
}
