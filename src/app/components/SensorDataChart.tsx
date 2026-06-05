'use client';
import React, { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Box,
  useColorModeValue,
  useBreakpointValue,
  useColorMode,
} from '@chakra-ui/react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import ChartAlertOverlay from './alert/ChartAlertOverlay';
import { SensorData } from '../data/dashboard/data';
import EmptyBox from './common/EmptyBox';
import UnifiedTooltip from './common/UnifiedTooltip';
import { useCalibratedStationChartRows } from '@/app/hooks/useCalibratedStationChartRows';
import { useUnitOverridesRevision } from '@/app/hooks/useUnitOverridesRevision';
import { resolveAxisUnit } from '@/app/utils/unitOverrides';
import { useChartAxisColors } from '@/app/utils/useChartAxisColors';
import ChartPanelHeading from './common/ChartPanelHeading';
import ChartLegend, {
  type ChartLegendPayloadEntry,
} from './common/ChartLegend';
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
  yAxisLabelInsideLeft,
  yAxisLabelInsideRight,
} from '@/app/utils/chartAxisConfig';

interface SensorDataChartProps {
  data: SensorData[];
}

const DASHBOARD_CHART_FIELDS = [
  { dataKey: 'temperature_weather', sensorKey: 'temperature_weather' },
  { dataKey: 'solar_radiation', sensorKey: 'solar_radiation' },
  { dataKey: 'et0', sensorKey: 'et0' },
] as const;

const SensorDataChart: React.FC<SensorDataChartProps> = ({ data }) => {
  const t = useTranslations();
  const validData = Array.isArray(data) && data.length > 0 ? data : [];
  useUnitOverridesRevision();

  const calibrated = useCalibratedStationChartRows(
    validData as unknown as Record<string, unknown>[],
    DASHBOARD_CHART_FIELDS
  );

  const lastEightData = useMemo(() => calibrated.slice(-8), [calibrated]);
  const chartData = useMemo(
    () => addTimeMsToChartRows(lastEightData, 'timestamp'),
    [lastEightData]
  );

  const tempUnit = resolveAxisUnit('temperature_weather');
  const solarUnit = resolveAxisUnit('solar_radiation');
  const et0Unit = resolveAxisUnit('et0');

  const chartColor = useColorModeValue('#2E924F', '#7ECB98');
  const chartBg = useColorModeValue('white', 'gray.800');
  const { axis, tickFill, grid } = useChartAxisColors();
  const p = useBreakpointValue({ base: 2, md: 4 });
  const { colorMode } = useColorMode();

  const xAxisProps = mergeAxisTheme(
    getAdaptiveTimeXAxisProps(chartData, 'timestamp'),
    axis,
    tickFill
  );
  const yTemp = mergeAxisTheme(getDefaultYAxisProps(1), axis, tickFill);
  const ySolar = mergeAxisTheme(getDefaultYAxisProps(0), axis, tickFill);
  const yEt0 = mergeAxisTheme(getDefaultYAxisProps(2), axis, tickFill);

  const [seriesVisible, setSeriesVisible] = useState({
    temperature_weather: true,
    solar_radiation: true,
    et0: true,
  });

  const handleLegendClick = (e: ChartLegendPayloadEntry) => {
    const k = e.dataKey;
    if (k !== 'temperature_weather' && k !== 'solar_radiation' && k !== 'et0')
      return;
    setSeriesVisible((p) => ({ ...p, [k]: !p[k as keyof typeof p] }));
  };

  const hiddenLegendKeys = Object.entries(seriesVisible)
    .filter(([, on]) => !on)
    .map(([key]) => key) as string[];

  if (validData.length === 0) {
    return (
      // <Box
      //   width="100%"
      //   height="100%"
      //   bg={chartBg}
      //   borderRadius="md"
      //   boxShadow="lg"
      //   p={p}
      //   overflow="hidden"
      //   display="flex"
      //   alignItems="center"
      //   justifyContent="center"
      // >
      //   <Spinner size="xl" color="green.500" />
      // </Box>
      <EmptyBox />
    );
  }

  return (
    <Box
      width="100%"
      height="100%"
      bg={chartBg}
      borderRadius="md"
      boxShadow="lg"
      p={p}
      overflow="hidden"
    >
      <Box mb={4}>
        <ChartPanelHeading
          color={colorMode === 'light' ? 'gray.700' : 'gray.200'}
          title={t('misc.sensorDataChart.title')}
          subtitle={t('misc.sensorDataChart.subtitle', {
            tempUnit,
            solarUnit,
            et0Unit,
          })}
        />
      </Box>
      <ResponsiveContainer width="100%" height={CHART_PLOT_HEIGHT_PX}>
        <LineChart
          data={chartData}
          margin={{
            top: 12,
            right: 88,
            left: CHART_MARGIN_LEFT_Y_LABEL,
            bottom: 8,
          }}
        >
          <CartesianGrid {...themedCartesianGrid(grid)} />
          <XAxis {...xAxisProps} />
          <YAxis
            yAxisId="temp"
            orientation="left"
            {...yTemp}
            label={yAxisLabelInsideLeft(
              t('misc.sensorDataChart.tempAxisLabel', { unit: tempUnit }),
              tickFill
            )}
          />
          <YAxis
            yAxisId="solar"
            orientation="right"
            {...ySolar}
            label={yAxisLabelInsideRight(solarUnit, tickFill)}
          />
          <YAxis
            yAxisId="et0"
            orientation="right"
            {...yEt0}
            width={48}
            offset={56}
            label={yAxisLabelInsideRight(
              t('misc.sensorDataChart.et0AxisLabel', { unit: et0Unit }),
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
            yAxisId="temp"
            type="monotone"
            dataKey="temperature_weather"
            stroke={chartColor}
            name={t('misc.sensorDataChart.seriesWithUnit', {
              name: t('sensors.air_temperature'),
              unit: tempUnit,
            })}
            strokeWidth={2.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={activeDotForSeries(chartColor)}
            hide={!seriesVisible.temperature_weather}
          />
          <Line
            yAxisId="solar"
            type="monotone"
            dataKey="solar_radiation"
            stroke="#82ca9d"
            name={t('misc.sensorDataChart.seriesWithUnit', {
              name: t('sensors.solar_radiation'),
              unit: solarUnit,
            })}
            strokeWidth={2.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={activeDotForSeries('#82ca9d')}
            hide={!seriesVisible.solar_radiation}
          />
          <Line
            yAxisId="et0"
            type="monotone"
            dataKey="et0"
            stroke="#ffc658"
            name={t('misc.sensorDataChart.seriesWithUnit', {
              name: t('sensors.et0'),
              unit: et0Unit,
            })}
            strokeWidth={2.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={activeDotForSeries('#ffc658')}
            hide={!seriesVisible.et0}
          />
          <ChartAlertOverlay sensorKey="temperature_weather" yAxisId="temp" />
          <ChartAlertOverlay sensorKey="et0" yAxisId="et0" />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default SensorDataChart;
