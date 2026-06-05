'use client';

/**
 * Plug-and-play recharts overlay for alerts.
 *
 * Usage — drop inside any recharts <LineChart>/<AreaChart>/<BarChart>:
 *
 *   <ChartAlertOverlay sensorKey="temperature_weather" yAxisId="temp" />
 *
 * It fetches /alerts/for-graph?sensor_key=... once, then renders one
 * <ReferenceLine> per active alert (color-coded by triggered state). The
 * recharts API requires children to be top-level inside the chart root,
 * so this component returns an array of ReferenceLines wrapped in a
 * fragment — keep it as a direct child of the chart, not nested inside
 * <foreignObject> / <Customized> / etc.
 */

import React, { useEffect, useState } from 'react';
import { ReferenceLine } from 'recharts';
import { alertApi, type GraphAlert } from '@/app/lib/alertApi';

export interface ChartAlertOverlayProps {
  sensorKey: string;
  zoneId?: number;
  yAxisId?: string;
  /** Override the alerts list — mainly for tests. */
  alerts?: GraphAlert[];
  /** Render label position; defaults to 'right'. */
  labelPosition?:
    | 'top'
    | 'right'
    | 'left'
    | 'bottom'
    | 'insideTop'
    | 'insideRight';
  /** Override colors. */
  triggeredColor?: string;
  idleColor?: string;
}

export const TRIGGERED_COLOR = '#ff4d4f'; // antd red-5
export const IDLE_COLOR = '#fa8c16'; // antd orange-6

const ChartAlertOverlay: React.FC<ChartAlertOverlayProps> = ({
  sensorKey,
  zoneId,
  yAxisId,
  alerts: alertsOverride,
  labelPosition = 'right',
  triggeredColor = TRIGGERED_COLOR,
  idleColor = IDLE_COLOR,
}) => {
  const [fetched, setFetched] = useState<GraphAlert[]>([]);

  useEffect(() => {
    if (alertsOverride) return;
    let cancelled = false;
    void alertApi
      .forGraph({ sensor_key: sensorKey, zone_id: zoneId })
      .then((rows) => {
        if (!cancelled) setFetched(rows);
      })
      .catch(() => {
        if (!cancelled) setFetched([]);
      });
    return () => {
      cancelled = true;
    };
  }, [sensorKey, zoneId, alertsOverride]);

  const alerts = alertsOverride ?? fetched;
  if (!alerts || alerts.length === 0) return null;

  return (
    <>
      {alerts
        .filter((a) => a.is_active && Number.isFinite(a.threshold))
        .map((a) => (
          <ReferenceLine
            key={a.id}
            yAxisId={yAxisId}
            y={a.threshold}
            stroke={a.is_triggered ? triggeredColor : idleColor}
            strokeDasharray="6 3"
            strokeWidth={1.5}
            ifOverflow="extendDomain"
            label={{
              value: `${a.name} ${a.condition} ${a.threshold}${a.unit ?? ''}`,
              position: labelPosition,
              fill: a.is_triggered ? triggeredColor : idleColor,
              fontSize: 11,
            }}
          />
        ))}
    </>
  );
};

export default ChartAlertOverlay;
