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
  CHART_MARGIN_LEFT_Y_LABEL,
  CHART_PLOT_HEIGHT_PX,
  analyticsChartPanelLayoutProps,
  yAxisLabelInsideLeft,
} from '@/app/utils/chartAxisConfig';

const PhSoilChart = ({
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
          soil_ph: calibrateChartValue('soil_ph', item.value),
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
  const yProps = mergeAxisTheme(getDefaultYAxisProps(2), axis, tickFill);
  const phUnit = resolveAxisUnit('soil_ph', data[0]?.default_unit);

  const handleLegendClick = (payload: ChartLegendPayloadEntry) => {
    if (payload?.dataKey === 'soil_ph') {
      setShowLine((prev) => !prev);
    }
  };

  const handleScreenshot = async () => {
    if (chartRef.current) {
      const canvas = await html2canvas(chartRef.current);
      const link = document.createElement('a');
      link.download = 'phSoil_chart.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const handleDownloadData = () => {
    const csv =
      'timestamp,soil_ph\n' +
      chartData.map((d) => `${d.name},${d.soil_ph}`).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'phSoil_data.csv';
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <Box {...analyticsChartPanelLayoutProps}>
      <Flex justify="space-between" align="center" mb={4}>
        <ChartPanelHeading
          color={textColor}
          title={t('sensors.soil_ph')}
          subtitle={t('analytics.phSoil.subtitle')}
        />
        <HStack spacing={2}>
          <Button
            aria-label={t('analytics.common.captureChartAria')}
            variant="ghost"
            onClick={handleScreenshot}
          >
            <FaCamera />
          </Button>
          <Button
            aria-label={t('analytics.common.exportCsvAria')}
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
              left: CHART_MARGIN_LEFT_Y_LABEL,
              bottom: 8,
            }}
          >
            <CartesianGrid {...themedCartesianGrid(grid)} />
            <XAxis {...xAxisProps} />
            <YAxis
              {...yProps}
              label={yAxisLabelInsideLeft(
                t('analytics.phSoil.axisLabel', { unit: phUnit }),
                tickFill
              )}
            />
            <Tooltip content={<UnifiedTooltip valuesAlreadyCalibrated />} />
            <Legend
              wrapperStyle={defaultLegendWrapperStyle}
              content={
                <ChartLegend
                  onClick={handleLegendClick}
                  hiddenDataKeys={showLine ? [] : ['soil_ph']}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="soil_ph"
              name={t('analytics.phSoil.seriesName', { unit: phUnit })}
              hide={!showLine}
              stroke="#82ca9d"
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={activeDotForSeries('#82ca9d')}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartStateView>
    </Box>
  );
};

export default PhSoilChart;
