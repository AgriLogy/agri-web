import React, { useMemo, useRef, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Box, Flex, Button, HStack } from '@chakra-ui/react';
import { FaDownload, FaCamera } from 'react-icons/fa';
import html2canvas from 'html2canvas';
import ChartPanelHeading from '../../common/ChartPanelHeading';
import ChartStateView from '../../common/ChartStateView';
import UnifiedTooltip from '../../common/UnifiedTooltip';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import { useUnitOverridesRevision } from '@/app/hooks/useUnitOverridesRevision';
import {
  compactResolvedAxisUnits,
  formatCalibratedReading,
  resolveAxisUnit,
} from '@/app/utils/unitOverrides';
import { calibratedValueInAxisUnit } from '@/app/utils/calibratedValueInAxisUnit';
import { getCatalogDefaultUnit } from '@/app/utils/sensorCatalog';
import { useChartAxisColors } from '@/app/utils/useChartAxisColors';
import ChartLegend, {
  type ChartLegendPayloadEntry,
} from '../../common/ChartLegend';
import {
  activeDotForSeries,
  addTimeMsToChartRows,
  defaultLegendWrapperStyle,
  getAdaptiveTimeXAxisProps,
  getDefaultYAxisProps,
  mergeAxisTheme,
  themedCartesianGrid,
  CHART_MARGIN_LEFT_Y_LABEL,
  CHART_PLOT_HEIGHT_PX,
  analyticsChartPanelLayoutProps,
  yAxisLabelInsideLeft,
} from '@/app/utils/chartAxisConfig';
import { TemperaturePoint } from './SoilTemperatureMain';

/** Normalized Y-axis space (catalog default for soil temperature). */
const SOIL_TEMP_AXIS_UNIT = getCatalogDefaultUnit('soil_temp_low') || '°C';

const SoilTemperatureChart = ({
  data,
  loading,
}: {
  data: TemperaturePoint[];
  loading: boolean;
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const unitRev = useUnitOverridesRevision();

  const soilTempDisplayUnits = compactResolvedAxisUnits(
    ['soil_temp_low', 'soil_temp_medium', 'soil_temp_high'],
    SOIL_TEMP_AXIS_UNIT
  );

  const [showLow, setShowLow] = useState(true);
  const [showMedium, setShowMedium] = useState(true);
  const [showHigh, setShowHigh] = useState(true);

  const chartData = useMemo(
    () =>
      addTimeMsToChartRows(
        data.map((d) => ({
          name: d.timestamp,
          rawLow: d.low,
          rawMedium: d.medium,
          rawHigh: d.high,
          low:
            d.low != null && Number.isFinite(d.low)
              ? calibratedValueInAxisUnit(
                  'soil_temp_low',
                  d.low,
                  SOIL_TEMP_AXIS_UNIT,
                  SOIL_TEMP_AXIS_UNIT
                )
              : d.low,
          medium:
            d.medium != null && Number.isFinite(d.medium)
              ? calibratedValueInAxisUnit(
                  'soil_temp_medium',
                  d.medium,
                  SOIL_TEMP_AXIS_UNIT,
                  SOIL_TEMP_AXIS_UNIT
                )
              : d.medium,
          high:
            d.high != null && Number.isFinite(d.high)
              ? calibratedValueInAxisUnit(
                  'soil_temp_high',
                  d.high,
                  SOIL_TEMP_AXIS_UNIT,
                  SOIL_TEMP_AXIS_UNIT
                )
              : d.high,
        })),
        'name'
      ),
    [data, unitRev]
  );

  const { textColor } = useColorModeStyles();
  const { axis, tickFill, grid } = useChartAxisColors();
  const xAxisProps = mergeAxisTheme(
    getAdaptiveTimeXAxisProps(chartData, 'name'),
    axis,
    tickFill
  );
  const yProps = mergeAxisTheme(getDefaultYAxisProps(1), axis, tickFill);

  const handleLegendClick = (e: ChartLegendPayloadEntry) => {
    const k = e.dataKey;
    if (k === 'low') setShowLow((s) => !s);
    else if (k === 'medium') setShowMedium((s) => !s);
    else if (k === 'high') setShowHigh((s) => !s);
  };

  const hiddenLegendKeys = [
    !showLow && 'low',
    !showMedium && 'medium',
    !showHigh && 'high',
  ].filter(Boolean) as string[];

  const handleScreenshot = async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current);
    const a = document.createElement('a');
    a.download = 'soil_temperature_chart.png';
    a.href = canvas.toDataURL();
    a.click();
  };

  const handleDownloadData = () => {
    const header = 'timestamp,low,medium,high\n';
    const rows = data
      .map(
        (d) => `${d.timestamp},${d.low ?? ''},${d.medium ?? ''},${d.high ?? ''}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'soil_temperature_data.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box {...analyticsChartPanelLayoutProps}>
      <Flex justify="space-between" align="center" mb={4}>
        <ChartPanelHeading
          color={textColor}
          title={`Température du sol (${soilTempDisplayUnits})`}
          subtitle="Profondeurs basse, moyenne et haute."
        />
        <HStack spacing={2}>
          <Button
            aria-label="Capture graphique"
            variant="ghost"
            onClick={handleScreenshot}
          >
            <FaCamera />
          </Button>
          <Button
            aria-label="Exporter CSV"
            variant="ghost"
            onClick={handleDownloadData}
          >
            <FaDownload />
          </Button>
        </HStack>
      </Flex>

      <ChartStateView
        loading={loading}
        empty={chartData.length === 0}
        chartRef={chartRef}
        height={CHART_PLOT_HEIGHT_PX}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 12,
              right: 12,
              left: CHART_MARGIN_LEFT_Y_LABEL,
              bottom: 8,
            }}
          >
            <CartesianGrid {...themedCartesianGrid(grid)} />

            <XAxis {...xAxisProps} />
            <YAxis
              {...yProps}
              domain={['auto', 'auto']}
              label={yAxisLabelInsideLeft(
                `Temp. sol (${soilTempDisplayUnits})`,
                tickFill
              )}
            />
            <Tooltip
              content={
                <UnifiedTooltip
                  valueFormatter={(_value, _name, item) => {
                    const p = item.payload as Record<string, unknown>;
                    const dk = String(item.dataKey ?? '');
                    const spec =
                      dk === 'low'
                        ? { key: 'soil_temp_low' as const, raw: 'rawLow' }
                        : dk === 'medium'
                          ? {
                              key: 'soil_temp_medium' as const,
                              raw: 'rawMedium',
                            }
                          : dk === 'high'
                            ? { key: 'soil_temp_high' as const, raw: 'rawHigh' }
                            : null;
                    if (spec) {
                      const r = p[spec.raw];
                      if (typeof r === 'number' && Number.isFinite(r)) {
                        return `${formatCalibratedReading(spec.key, r)} ${resolveAxisUnit(spec.key)}`.trim();
                      }
                    }
                    const n =
                      typeof _value === 'number' ? _value : Number(_value);
                    return Number.isFinite(n)
                      ? n.toFixed(2)
                      : String(_value ?? '—');
                  }}
                />
              }
            />
            <Legend
              wrapperStyle={defaultLegendWrapperStyle}
              content={
                <ChartLegend
                  onClick={handleLegendClick}
                  hiddenDataKeys={hiddenLegendKeys}
                />
              }
            />

            <Line
              type="monotone"
              dataKey="low"
              name="Basse"
              stroke="#3182CE"
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={activeDotForSeries('#3182CE')}
              hide={!showLow}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="medium"
              name="Moyenne"
              stroke="#2F855A"
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={activeDotForSeries('#2F855A')}
              hide={!showMedium}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="high"
              name="Haute"
              stroke="#E53E3E"
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={activeDotForSeries('#E53E3E')}
              hide={!showHigh}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartStateView>
    </Box>
  );
};

export default SoilTemperatureChart;
