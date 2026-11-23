'use client';

/**
 * 12-month trend of a stored satellite index (agri-api#459 phase 3,
 * `/farm-map/ndvi/sectors/{id}/history`): mean line + min–max band. Separate
 * file so tests can stub recharts out.
 */

import { useTranslations } from 'next-intl';
import { Box, useColorModeValue } from '@chakra-ui/react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { HistoryRow } from '@/app/lib/farmMap/ndvi';

const monthTick = (iso: string) => {
  const m = /^(\d{4})-(\d{2})/.exec(iso);
  return m ? `${m[2]}/${m[1].slice(2)}` : iso;
};

export default function NdviHistoryChart({ rows }: { rows: HistoryRow[] }) {
  const t = useTranslations();
  const stroke = useColorModeValue('#2f855a', '#68d391');
  const band = useColorModeValue('#c6f6d5', '#276749');
  const grid = useColorModeValue('#e2e8f0', '#4a5568');
  const axis = useColorModeValue('#4a5568', '#cbd5e0');
  const tooltipBg = useColorModeValue('#ffffff', '#2d3748');
  if (rows.length < 2) return null;
  return (
    <Box h="140px" w="100%" maxW="420px" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={rows}
          margin={{ top: 4, right: 6, bottom: 0, left: -22 }}
        >
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={monthTick}
            tick={{ fontSize: 10, fill: axis }}
            minTickGap={24}
          />
          <YAxis
            domain={[-0.2, 1]}
            ticks={[0, 0.4, 0.8]}
            tick={{ fontSize: 10, fill: axis }}
            width={40}
          />
          <Tooltip
            contentStyle={{ fontSize: 11, background: tooltipBg }}
            formatter={(v) =>
              Array.isArray(v)
                ? v.map((x) => Number(x).toFixed(2)).join(' – ')
                : Number(v).toFixed(2)
            }
          />
          <Area
            dataKey="range"
            name={t('misc.map.ndviHistory.range')}
            stroke="none"
            fill={band}
            fillOpacity={0.6}
            connectNulls
            isAnimationActive={false}
          />
          <Line
            dataKey="mean"
            name={t('misc.map.ndviHistory.mean')}
            stroke={stroke}
            strokeWidth={2}
            dot={{ r: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
}
