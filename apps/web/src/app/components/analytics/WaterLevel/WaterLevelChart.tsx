import React, { useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  Area,
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
import { Box, Flex, Button, HStack } from '@chakra-ui/react';
import { FaDownload, FaCamera } from 'react-icons/fa';
import html2canvas from 'html2canvas';
import { colorForSensor, chartSeries } from '@agri/ui';
import ChartPanelHeading from '../../common/ChartPanelHeading';
import ChartStateView from '../../common/ChartStateView';
import UnifiedTooltip from '../../common/UnifiedTooltip';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import { useUnitOverridesRevision } from '@/app/hooks/useUnitOverridesRevision';
import { useChartAxisColors } from '@/app/utils/useChartAxisColors';
import ChartLegend from '../../common/ChartLegend';
import {
  activeDotForSeries,
  addTimeMsToChartRows,
  defaultLegendWrapperStyle,
  getAdaptiveTimeXAxisProps,
  getDefaultYAxisProps,
  mergeAxisTheme,
  themedCartesianGrid,
  getChartMarginLeft,
  CHART_PLOT_HEIGHT_PX,
  analyticsChartPanelLayoutProps,
  yAxisLabelInsideLeft,
} from '@/app/utils/chartAxisConfig';

export interface BasinChartRow {
  timestamp: string;
  /** Raw captor distance D(t) in sensor units. */
  distance: number;
  waterHeight: number;
  fillPct: number;
  volumeL: number;
}

const STROKE_VOL = colorForSensor('water_level');
const STROKE_PCT = chartSeries.skyBlue;

const WaterLevelChart = ({
  data,
  loading,
  vMaxL,
  hasGeometry,
}: {
  data: BasinChartRow[];
  loading: boolean;
  vMaxL: number | null;
  hasGeometry: boolean;
}) => {
  const t = useTranslations();
  const chartRef = useRef<HTMLDivElement>(null);
  const unitRev = useUnitOverridesRevision();

  const chartData = useMemo(
    () =>
      addTimeMsToChartRows(
        data.map((item) => ({
          name: item.timestamp,
          volumeL: item.volumeL,
          fillPct: item.fillPct,
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

  const handleScreenshot = async () => {
    if (chartRef.current) {
      const canvas = await html2canvas(chartRef.current);
      const link = document.createElement('a');
      link.download = 'basin_volume_chart.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const handleDownloadData = () => {
    const csv =
      'timestamp,volume_L,fill_pct\n' +
      data.map((d) => `${d.timestamp},${d.volumeL},${d.fillPct}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'basin_volume_data.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box {...analyticsChartPanelLayoutProps}>
      <Flex
        justify="space-between"
        align={{ base: 'flex-start', md: 'center' }}
        gap={2}
        mb={4}
      >
        <ChartPanelHeading
          color={textColor}
          title={t('analytics.waterLevel.chartTitle')}
          subtitle={t('analytics.waterLevel.chartSubtitle')}
        />
        <HStack spacing={2}>
          <Button
            aria-label={t('analytics.actions.captureChart')}
            variant="ghost"
            onClick={handleScreenshot}
          >
            <FaCamera />
          </Button>
          <Button
            aria-label={t('analytics.actions.exportCsv')}
            variant="ghost"
            onClick={handleDownloadData}
          >
            <FaDownload />
          </Button>
        </HStack>
      </Flex>

      <ChartStateView
        loading={loading}
        empty={data.length === 0}
        chartRef={chartRef}
        height={CHART_PLOT_HEIGHT_PX}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{
              top: 12,
              right: 12,
              left: getChartMarginLeft(),
              bottom: 8,
            }}
          >
            <CartesianGrid {...themedCartesianGrid(grid)} />
            <XAxis {...xAxisProps} />
            <YAxis
              yAxisId="vol"
              {...yProps}
              label={yAxisLabelInsideLeft('L', tickFill)}
            />
            <YAxis
              yAxisId="pct"
              orientation="right"
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip content={<UnifiedTooltip valuesAlreadyCalibrated />} />
            <Legend
              wrapperStyle={defaultLegendWrapperStyle}
              content={<ChartLegend />}
            />
            <Area
              yAxisId="vol"
              type="monotone"
              dataKey="volumeL"
              name={`${t('analytics.waterLevel.volumeSeries')} (L)`}
              stroke={STROKE_VOL}
              fill={STROKE_VOL}
              fillOpacity={0.25}
              strokeWidth={2.25}
              dot={false}
              activeDot={activeDotForSeries(STROKE_VOL)}
              isAnimationActive={false}
            />
            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="fillPct"
              name={`${t('analytics.waterLevel.fillSeries')} (%)`}
              stroke={STROKE_PCT}
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              activeDot={activeDotForSeries(STROKE_PCT)}
              isAnimationActive={false}
            />
            {vMaxL != null && hasGeometry && (
              <ReferenceLine
                yAxisId="vol"
                y={vMaxL}
                stroke="#e53e3e"
                strokeDasharray="4 4"
                label={{ value: 'V_max', fontSize: 11, fill: '#e53e3e' }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </ChartStateView>
    </Box>
  );
};

export default WaterLevelChart;
