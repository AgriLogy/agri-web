import React, { useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  BarChart,
  Bar,
  Rectangle,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Box, Flex, Button, HStack, useColorMode } from '@chakra-ui/react';
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
  addTimeMsToChartRows,
  defaultBarProps,
  defaultLegendWrapperStyle,
  getAdaptiveTimeXAxisProps,
  getDefaultYAxisProps,
  maxBarSizeForPointCount,
  mergeAxisTheme,
  themedCartesianGrid,
  getChartMarginLeft,
  CHART_PLOT_HEIGHT_PX,
  analyticsChartPanelLayoutProps,
  yAxisLabelInsideLeft,
} from '@/app/utils/chartAxisConfig';
import { chartSeries } from '@agri/ui';

const PrecipitationRateChart = ({
  data,
  loading,
}: {
  data: SensorData[];
  loading: boolean;
}) => {
  const t = useTranslations();
  const chartRef = useRef<HTMLDivElement>(null);
  const [showBar, setShowBar] = useState(true);
  const unitRev = useUnitOverridesRevision();

  const chartData = useMemo(
    () =>
      addTimeMsToChartRows(
        data.map((item) => ({
          name: item.timestamp,
          precipitation_rate: calibrateChartValue(
            'precipitation_rate',
            item.value
          ),
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

  const handleLegendClick = (payload: ChartLegendPayloadEntry) => {
    if (payload?.dataKey === 'precipitation_rate') {
      setShowBar((prev) => !prev);
    }
  };

  const handleScreenshot = async () => {
    if (chartRef.current) {
      const canvas = await html2canvas(chartRef.current);
      const link = document.createElement('a');
      link.download = 'precipitation_rate.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const handleDownloadData = () => {
    const csv =
      'timestamp,precipitation_rate\n' +
      chartData.map((d) => `${d.name},${d.precipitation_rate}`).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'precipitation_rate_data.csv';
    link.click();

    URL.revokeObjectURL(url);
  };
  const { colorMode } = useColorMode();
  const precipUnit = resolveAxisUnit(
    'precipitation_rate',
    data[0]?.default_unit
  );
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
          title={t('analytics.precipitationRate.title')}
          subtitle={t('analytics.precipitationRate.subtitle')}
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
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: getChartMarginLeft(),
              bottom: 5,
            }}
            barCategoryGap="14%"
            onClick={(_e) => {
              // optional: if you want to toggle bar by clicking legend label only
            }}
          >
            <CartesianGrid {...themedCartesianGrid(grid)} />
            <XAxis {...xAxisProps} />
            <YAxis
              {...yProps}
              label={yAxisLabelInsideLeft(
                t('analytics.precipitationRate.intensityAxis', {
                  unit: precipUnit,
                }),
                tickFill
              )}
            />
            <Tooltip content={<UnifiedTooltip valuesAlreadyCalibrated />} />
            <Legend
              wrapperStyle={defaultLegendWrapperStyle}
              content={
                <ChartLegend
                  onClick={handleLegendClick}
                  hiddenDataKeys={showBar ? [] : ['precipitation_rate']}
                />
              }
            />
            <Bar
              dataKey="precipitation_rate"
              name={t('analytics.precipitationRate.seriesName', {
                unit: precipUnit,
              })}
              {...defaultBarProps}
              maxBarSize={maxBarSizeForPointCount(chartData.length)}
              hide={!showBar}
              fill={
                colorMode === 'dark' ? chartSeries.rainDark : chartSeries.rain
              }
              activeBar={<Rectangle fill="gold" stroke="purple" />}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartStateView>
    </Box>
  );
};

export default PrecipitationRateChart;
