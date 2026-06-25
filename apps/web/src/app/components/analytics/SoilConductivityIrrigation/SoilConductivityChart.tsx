import {
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  Bar,
  ComposedChart,
} from 'recharts';
import { Box, Flex, Button, HStack } from '@chakra-ui/react';
import { FaCamera, FaDownload } from 'react-icons/fa';
import { useTranslations } from 'next-intl';
import html2canvas from 'html2canvas';
import { SensorData } from '@/app/types';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import { useMemo, useRef, useState } from 'react';
import ChartPanelHeading from '../../common/ChartPanelHeading';
import ChartStateView from '../../common/ChartStateView';
import UnifiedTooltip from '../../common/UnifiedTooltip';
import { useUnitOverridesRevision } from '@/app/hooks/useUnitOverridesRevision';
import { calibrateChartValue } from '@/app/utils/chartSeriesCalibration';
import {
  formatCalibratedReading,
  resolveAxisUnit,
} from '@/app/utils/unitOverrides';
import { useChartAxisColors } from '@/app/utils/useChartAxisColors';
import ChartLegend, {
  type ChartLegendPayloadEntry,
} from '../../common/ChartLegend';
import {
  activeDotForSeries,
  addTimeMsToChartRows,
  defaultBarProps,
  defaultLegendWrapperStyle,
  getAdaptiveTimeXAxisProps,
  getDefaultYAxisProps,
  maxBarSizeForPointCount,
  mergeAxisTheme,
  themedCartesianGrid,
  getChartMarginLeft,
  getChartMarginRight,
  CHART_PLOT_HEIGHT_PX,
  analyticsChartPanelLayoutProps,
  yAxisLabelInsideLeft,
  yAxisLabelInsideRight,
} from '@/app/utils/chartAxisConfig';
import { colorForSensor } from '@agri/ui';

const SoilConductivityChart = ({
  lowData,
  highData,
  flowData,
  loading,
}: {
  lowData: SensorData[];
  highData: SensorData[];
  flowData: SensorData[];
  loading: boolean;
}) => {
  const t = useTranslations();
  const [activeLines, setActiveLines] = useState({
    ec_low: true,
    ec_high: true,
    water_flow: true,
  });
  const chartRef = useRef<HTMLDivElement>(null);
  const { textColor } = useColorModeStyles();
  const { axis, tickFill, grid } = useChartAxisColors();
  const unitRev = useUnitOverridesRevision();

  const handleLegendClick = (e: ChartLegendPayloadEntry) => {
    const key = e.dataKey;
    if (key !== 'ec_low' && key !== 'ec_high' && key !== 'water_flow') return;
    setActiveLines((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const hiddenLegendKeys = (
    ['ec_low', 'ec_high', 'water_flow'] as const
  ).filter((k) => !activeLines[k]);

  const chartDataRaw = useMemo(() => {
    const flowMap = new Map(flowData.map((f) => [f.timestamp, f]));
    return lowData.map((item, index) => {
      const flowRow = flowMap.get(item.timestamp);
      const wf = flowRow?.value;
      const hv = highData[index]?.value;
      return {
        timestamp: item.timestamp,
        raw_ec_low: item.value,
        raw_ec_high: hv,
        raw_water_flow: wf,
        ec_low: calibrateChartValue('soil_conductivity', item.value),
        ec_high:
          hv != null && Number.isFinite(hv)
            ? calibrateChartValue('soil_conductivity', hv)
            : null,
        water_flow:
          wf != null && Number.isFinite(wf)
            ? calibrateChartValue('water_flow', wf)
            : null,
      };
    });
  }, [lowData, highData, flowData, unitRev]);

  const chartData = useMemo(
    () => addTimeMsToChartRows(chartDataRaw, 'timestamp'),
    [chartDataRaw]
  );

  const xAxisProps = mergeAxisTheme(
    getAdaptiveTimeXAxisProps(chartData, 'timestamp'),
    axis,
    tickFill
  );
  const yEc = mergeAxisTheme(getDefaultYAxisProps(0), axis, tickFill);
  const yFlow = mergeAxisTheme(getDefaultYAxisProps(2), axis, tickFill);

  const ecUnit = resolveAxisUnit('soil_conductivity', lowData[0]?.default_unit);
  const flowUnit = resolveAxisUnit('water_flow', flowData[0]?.default_unit);

  const handleScreenshot = async () => {
    if (chartRef.current) {
      const canvas = await html2canvas(chartRef.current);
      const link = document.createElement('a');
      link.download = 'soil_conductivity_chart.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const handleDownloadData = () => {
    const csv =
      'timestamp,ec_low,ec_high,water_flow\n' +
      chartDataRaw
        .map((d) => `${d.timestamp},${d.ec_low},${d.ec_high},${d.water_flow}`)
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'soil_conductivity.csv';
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
          title={t('analytics.soilConductivity.title')}
          subtitle={t('analytics.soilConductivity.subtitle')}
        />
        <HStack spacing={2}>
          <Button onClick={handleScreenshot}>
            <FaCamera />
          </Button>
          <Button onClick={handleDownloadData}>
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
          <ComposedChart
            data={chartData}
            margin={{
              top: 12,
              right: getChartMarginRight(),
              left: getChartMarginLeft(),
              bottom: 8,
            }}
            barCategoryGap="14%"
          >
            <CartesianGrid {...themedCartesianGrid(grid)} />
            <XAxis {...xAxisProps} />
            <YAxis
              yAxisId="left"
              {...yEc}
              label={yAxisLabelInsideLeft(
                `${t('analytics.soilConductivity.ecAxis')} (${ecUnit})`,
                tickFill
              )}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              {...yFlow}
              label={yAxisLabelInsideRight(
                `${t('analytics.soilConductivity.flowAxis')} (${flowUnit})`,
                tickFill
              )}
            />
            <Tooltip
              content={
                <UnifiedTooltip
                  valueFormatter={(_v, _n, item) => {
                    const p = item.payload as {
                      raw_ec_low?: number;
                      raw_ec_high?: number;
                      raw_water_flow?: number;
                    };
                    const dk = item.dataKey;
                    if (
                      dk === 'ec_low' &&
                      typeof p.raw_ec_low === 'number' &&
                      Number.isFinite(p.raw_ec_low)
                    ) {
                      return `${formatCalibratedReading('soil_conductivity', p.raw_ec_low)} ${ecUnit}`.trim();
                    }
                    if (
                      dk === 'ec_high' &&
                      typeof p.raw_ec_high === 'number' &&
                      Number.isFinite(p.raw_ec_high)
                    ) {
                      return `${formatCalibratedReading('soil_conductivity', p.raw_ec_high)} ${ecUnit}`.trim();
                    }
                    if (
                      dk === 'water_flow' &&
                      typeof p.raw_water_flow === 'number' &&
                      Number.isFinite(p.raw_water_flow)
                    ) {
                      return `${formatCalibratedReading('water_flow', p.raw_water_flow)} ${flowUnit}`.trim();
                    }
                    const n = typeof _v === 'number' ? _v : Number(_v);
                    return Number.isFinite(n)
                      ? `${n.toFixed(2)}`
                      : String(_v ?? '—');
                  }}
                />
              }
            />
            <Legend
              wrapperStyle={defaultLegendWrapperStyle}
              content={
                <ChartLegend
                  onClick={handleLegendClick}
                  hiddenDataKeys={[...hiddenLegendKeys]}
                />
              }
            />

            <Line
              yAxisId="left"
              type="monotone"
              dataKey="ec_low"
              name={`${t('analytics.soilConductivity.lowProbe')} (${ecUnit})`}
              hide={!activeLines.ec_low}
              stroke={colorForSensor('ec_low')}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={activeDotForSeries(colorForSensor('ec_low'))}
            />

            <Line
              yAxisId="left"
              type="monotone"
              dataKey="ec_high"
              name={`${t('analytics.soilConductivity.highProbe')} (${ecUnit})`}
              hide={!activeLines.ec_high}
              stroke={colorForSensor('ec_high')}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={activeDotForSeries(colorForSensor('ec_high'))}
            />

            <Bar
              yAxisId="right"
              dataKey="water_flow"
              name={`${t('analytics.soilConductivity.irrigation')} (${flowUnit})`}
              {...defaultBarProps}
              hide={!activeLines.water_flow}
              fill={colorForSensor('water_flow_irrigation')}
              maxBarSize={maxBarSizeForPointCount(chartData.length)}
              fillOpacity={0.75}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartStateView>
    </Box>
  );
};

export default SoilConductivityChart;
