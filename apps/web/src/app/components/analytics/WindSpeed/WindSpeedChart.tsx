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
import { Box, Flex, Button, HStack } from '@chakra-ui/react';
import { FaDownload, FaCamera } from 'react-icons/fa';
import html2canvas from 'html2canvas';
import { SensorData } from '@/app/types';
import ChartPanelHeading from '../../common/ChartPanelHeading';
import ChartStateView from '../../common/ChartStateView';
import UnifiedTooltip from '../../common/UnifiedTooltip';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
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
  CHART_PLOT_HEIGHT_PX,
  analyticsChartPanelLayoutProps,
  yAxisLabelInsideLeft,
} from '@/app/utils/chartAxisConfig';
import { colorForSensor } from '@agri/ui';

const WindSpeedChart = ({
  data,
  loading,
}: {
  data: SensorData[];
  loading: boolean;
}) => {
  const t = useTranslations();
  const chartRef = useRef<HTMLDivElement>(null);
  const [showLine, setShowLine] = useState(true);
  const unitRev = useUnitOverridesRevision();

  const chartData = useMemo(
    () =>
      addTimeMsToChartRows(
        data.map((item) => ({
          name: item.timestamp,
          wind_speed: calibrateChartValue('wind_speed', item.value),
          default_unit: item.default_unit,
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
  const windUnit = resolveAxisUnit('wind_speed', data[0]?.default_unit);

  const handleLegendClick = (entry: ChartLegendPayloadEntry) => {
    if (entry?.dataKey === 'wind_speed') {
      setShowLine((prev) => !prev);
    }
  };

  const handleScreenshot = async () => {
    if (chartRef.current) {
      const canvas = await html2canvas(chartRef.current);
      const link = document.createElement('a');
      link.download = 'wind_speed_chart.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const handleDownloadData = () => {
    const csv =
      'timestamp,wind_speed\n' +
      chartData.map((d) => `${d.name},${d.wind_speed}`).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'wind_speed_data.csv';
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
          title={t('analytics.windSpeed.chartTitle')}
          subtitle={t('analytics.windSpeed.chartSubtitle')}
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
          <LineChart
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
              {...yProps}
              label={yAxisLabelInsideLeft(windUnit, tickFill)}
            />
            <Tooltip content={<UnifiedTooltip valuesAlreadyCalibrated />} />
            <Legend
              wrapperStyle={defaultLegendWrapperStyle}
              content={
                <ChartLegend
                  onClick={handleLegendClick}
                  hiddenDataKeys={showLine ? [] : ['wind_speed']}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="wind_speed"
              name={`${t('sensors.wind_speed')} (${windUnit})`}
              hide={!showLine}
              stroke={colorForSensor('wind_speed')}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={activeDotForSeries(colorForSensor('wind_speed'))}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartStateView>
    </Box>
  );
};

export default WindSpeedChart;
