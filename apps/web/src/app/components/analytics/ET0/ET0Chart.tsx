import React, { useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Box, useColorModeValue, Button, HStack, Flex } from '@chakra-ui/react';
import { FaDownload, FaCamera } from 'react-icons/fa';
import html2canvas from 'html2canvas';
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
import { colorForSensor } from '@agri/ui';

interface Et0Data {
  timestamp: string;
  value: number;
  default_unit: string;
}

const EC0Chart = ({
  weatherData,
  calculatedData,
  openMeteoData = [],
  loading,
}: {
  weatherData: Et0Data[];
  calculatedData: Et0Data[];
  openMeteoData?: Et0Data[];
  loading: boolean;
}) => {
  const t = useTranslations();
  const chartRef = useRef<HTMLDivElement>(null);
  const unitRev = useUnitOverridesRevision();

  // Build chart rows from a timestamp-keyed UNION of the two series rather
  // than zipping by index. The previous implementation iterated weatherData
  // and looked up calculatedData[index], which collapsed to an empty chart
  // the moment weatherData was empty — even when the calculated series had
  // hundreds of points. Today that is the production state: Et0Weather has
  // no ingest path, Et0Calculated is filled hourly by the Celery task.
  const chartData = useMemo(() => {
    const calibrate = (v: number | null | undefined) =>
      v != null && Number.isFinite(v) ? calibrateChartValue('et0', v) : null;

    type Row = {
      name: string;
      et0_sensor: number | null;
      et0_calculated: number | null;
      et0_openmeteo: number | null;
    };
    const rowsByTimestamp = new Map<string, Row>();
    const rowFor = (timestamp: string): Row => {
      let row = rowsByTimestamp.get(timestamp);
      if (!row) {
        row = {
          name: timestamp,
          et0_sensor: null,
          et0_calculated: null,
          et0_openmeteo: null,
        };
        rowsByTimestamp.set(timestamp, row);
      }
      return row;
    };

    for (const item of weatherData) {
      rowFor(item.timestamp).et0_sensor = calibrate(item.value);
    }
    for (const item of calculatedData) {
      rowFor(item.timestamp).et0_calculated = calibrate(item.value);
    }
    // Open-Meteo is a daily reference (one point per day, stamped at noon) —
    // it lands on its own rows and is drawn as a connecting line.
    for (const item of openMeteoData) {
      rowFor(item.timestamp).et0_openmeteo = calibrate(item.value);
    }

    const merged = Array.from(rowsByTimestamp.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    return addTimeMsToChartRows(merged, 'name');
  }, [weatherData, calculatedData, openMeteoData, unitRev]);

  const textColor = useColorModeValue('gray.800', 'gray.200');
  const { axis, tickFill, grid } = useChartAxisColors();
  const xAxisProps = mergeAxisTheme(
    getAdaptiveTimeXAxisProps(chartData, 'name'),
    axis,
    tickFill
  );
  const yProps = mergeAxisTheme(getDefaultYAxisProps(2), axis, tickFill);

  const [seriesVisible, setSeriesVisible] = useState({
    et0_sensor: true,
    et0_calculated: true,
    et0_openmeteo: true,
  });

  const handleLegendClick = (e: ChartLegendPayloadEntry) => {
    const k = e.dataKey;
    if (k !== 'et0_sensor' && k !== 'et0_calculated' && k !== 'et0_openmeteo') {
      return;
    }
    setSeriesVisible((p) => ({ ...p, [k]: !p[k as keyof typeof p] }));
  };

  const hiddenLegendKeys = Object.entries(seriesVisible)
    .filter(([, on]) => !on)
    .map(([key]) => key) as string[];

  const handleScreenshot = async () => {
    if (chartRef.current) {
      const canvas = await html2canvas(chartRef.current);
      const link = document.createElement('a');
      link.download = 'et0_chart.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const handleDownloadData = () => {
    const csv =
      'timestamp,et0_sensor,et0_calculated,et0_openmeteo\n' +
      chartData
        .map(
          (d) =>
            `${d.name},${d.et0_sensor ?? ''},${d.et0_calculated ?? ''},${d.et0_openmeteo ?? ''}`
        )
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'et0_data.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const et0Unit = resolveAxisUnit(
    'et0',
    weatherData[0]?.default_unit ??
      calculatedData[0]?.default_unit ??
      openMeteoData[0]?.default_unit
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
          title={t('analytics.et0Chart.title')}
          subtitle={t('analytics.et0Chart.subtitle', { unit: et0Unit })}
        />
        <HStack spacing={2}>
          <Button
            aria-label={t('analytics.et0Chart.captureChart')}
            variant="ghost"
            onClick={handleScreenshot}
          >
            <FaCamera />
          </Button>
          <Button
            aria-label={t('analytics.et0Chart.exportCsv')}
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
        emptyText={t('analytics.et0Chart.noData')}
        chartRef={chartRef}
        height={CHART_PLOT_HEIGHT_PX}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{
              top: 10,
              right: 30,
              left: getChartMarginLeft(),
              bottom: 5,
            }}
            barCategoryGap="14%"
          >
            <CartesianGrid {...themedCartesianGrid(grid)} />
            <XAxis {...xAxisProps} />
            <YAxis
              {...yProps}
              label={yAxisLabelInsideLeft(
                t('analytics.et0Chart.yAxisLabel', { unit: et0Unit }),
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
            <Bar
              dataKey="et0_sensor"
              {...defaultBarProps}
              maxBarSize={maxBarSizeForPointCount(chartData.length)}
              fill={colorForSensor('et0_sensor')}
              name={t('analytics.et0Chart.seriesSensor', { unit: et0Unit })}
              hide={!seriesVisible.et0_sensor}
            />
            <Bar
              dataKey="et0_calculated"
              {...defaultBarProps}
              maxBarSize={maxBarSizeForPointCount(chartData.length)}
              fill={colorForSensor('et0_calculated')}
              name={t('analytics.et0Chart.seriesCalculated', { unit: et0Unit })}
              hide={!seriesVisible.et0_calculated}
            />
            <Line
              type="monotone"
              dataKey="et0_openmeteo"
              stroke={colorForSensor('et0_openmeteo')}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 4 }}
              connectNulls
              isAnimationActive={false}
              name={t('analytics.et0Chart.seriesOpenMeteo', { unit: et0Unit })}
              hide={!seriesVisible.et0_openmeteo}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartStateView>
    </Box>
  );
};

export default EC0Chart;
