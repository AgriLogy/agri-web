import React, { useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
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
import { Box, Flex, HStack, Button } from '@chakra-ui/react';
import { FaCamera, FaDownload } from 'react-icons/fa';
import html2canvas from 'html2canvas';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import ChartPanelHeading from '../../common/ChartPanelHeading';
import ChartStateView from '../../common/ChartStateView';
import UnifiedTooltip from '../../common/UnifiedTooltip';
import { useUnitOverridesRevision } from '@/app/hooks/useUnitOverridesRevision';
import { calibrateChartValue } from '@/app/utils/chartSeriesCalibration';
import { resolveAxisUnit } from '@/app/utils/unitOverrides';
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
  getChartMarginLeft,
  getChartMarginRight,
  CHART_PLOT_HEIGHT_PX,
  analyticsChartPanelLayoutProps,
  yAxisLabelInsideLeft,
  yAxisLabelInsideRight,
} from '@/app/utils/chartAxisConfig';

type SensorData = { timestamp: string; value: number };

const SensorLeafChart = ({
  temperatureData,
  moistureData,
  loading,
}: {
  temperatureData: SensorData[];
  moistureData: SensorData[];
  loading: boolean;
}) => {
  const t = useTranslations();
  const chartRef = useRef<HTMLDivElement>(null);
  const { textColor } = useColorModeStyles();
  const { axis, tickFill, grid } = useChartAxisColors();
  const unitRev = useUnitOverridesRevision();

  const combinedData = useMemo(
    () =>
      temperatureData.map((t) => {
        const moisturePoint = moistureData.find(
          (m) => m.timestamp === t.timestamp
        );
        return {
          name: t.timestamp,
          leaf_temperature: calibrateChartValue('leaf_temperature', t.value),
          leaf_moisture:
            moisturePoint != null
              ? calibrateChartValue('leaf_moisture', moisturePoint.value)
              : null,
        };
      }),
    [temperatureData, moistureData, unitRev]
  );

  const chartData = useMemo(
    () => addTimeMsToChartRows(combinedData, 'name'),
    [combinedData]
  );

  const xAxisProps = mergeAxisTheme(
    getAdaptiveTimeXAxisProps(chartData, 'name'),
    axis,
    tickFill
  );
  const yTemp = mergeAxisTheme(getDefaultYAxisProps(1), axis, tickFill);
  const yMoist = mergeAxisTheme(getDefaultYAxisProps(0), axis, tickFill);

  const tempUnit = resolveAxisUnit('leaf_temperature');
  const moistureUnit = resolveAxisUnit('leaf_moisture');

  const [activeLines, setActiveLines] = useState({
    leaf_temperature: true,
    leaf_moisture: true,
  });

  const handleLegendClick = (e: ChartLegendPayloadEntry) => {
    const key = e.dataKey;
    if (key !== 'leaf_temperature' && key !== 'leaf_moisture') return;
    setActiveLines((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  const hiddenLegendKeys = Object.entries(activeLines)
    .filter(([, on]) => !on)
    .map(([k]) => k) as string[];

  const handleScreenshot = async () => {
    if (chartRef.current) {
      const canvas = await html2canvas(chartRef.current);
      const link = document.createElement('a');
      link.download = 'leaf_chart.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const handleDownloadData = () => {
    const csv =
      'timestamp,temperature,moisture\n' +
      combinedData
        .map((d) => `${d.name},${d.leaf_temperature},${d.leaf_moisture ?? ''}`)
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'leaf_data.csv';
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
          title={t('analytics.leaf.chartTitle')}
          subtitle={t('analytics.leaf.chartSubtitle')}
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
        empty={combinedData.length === 0}
        chartRef={chartRef}
        height={CHART_PLOT_HEIGHT_PX}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 12,
              right: getChartMarginRight(),
              left: getChartMarginLeft(),
              bottom: 8,
            }}
          >
            <CartesianGrid {...themedCartesianGrid(grid)} />
            <XAxis {...xAxisProps} />
            <YAxis
              yAxisId="left"
              {...yTemp}
              label={yAxisLabelInsideLeft(
                t('analytics.leaf.axisTemp', { unit: tempUnit }),
                tickFill
              )}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              {...yMoist}
              label={yAxisLabelInsideRight(
                t('analytics.leaf.axisMoisture', { unit: moistureUnit }),
                tickFill
              )}
            />
            <Tooltip content={<UnifiedTooltip valuesAlreadyCalibrated />} />
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
              yAxisId="left"
              type="monotone"
              dataKey="leaf_temperature"
              name={`${t('sensors.leaf_temperature')} (${tempUnit})`}
              hide={!activeLines.leaf_temperature}
              stroke="#ff7300"
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={activeDotForSeries('#ff7300')}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="leaf_moisture"
              name={`${t('sensors.leaf_moisture')} (${moistureUnit})`}
              hide={!activeLines.leaf_moisture}
              stroke="#007aff"
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={activeDotForSeries('#007aff')}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartStateView>
    </Box>
  );
};

export default SensorLeafChart;
