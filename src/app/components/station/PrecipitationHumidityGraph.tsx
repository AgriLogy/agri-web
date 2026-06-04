'use client';
import { Box, useColorMode } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useCalibratedStationChartRows } from '@/app/hooks/useCalibratedStationChartRows';
import { useUnitOverridesRevision } from '@/app/hooks/useUnitOverridesRevision';
import { resolveAxisUnit } from '@/app/utils/unitOverrides';
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
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import ChartPanelHeading from '../common/ChartPanelHeading';
import ChartStateView from '../common/ChartStateView';
import UnifiedTooltip from '../common/UnifiedTooltip';
import { useChartAxisColors } from '@/app/utils/useChartAxisColors';
import ChartLegend, {
  type ChartLegendPayloadEntry,
} from '../common/ChartLegend';
import {
  activeDotForSeries,
  addTimeMsToChartRows,
  defaultLegendWrapperStyle,
  getAdaptiveTimeXAxisProps,
  getDefaultYAxisProps,
  mergeAxisTheme,
  themedCartesianGrid,
  CHART_MARGIN_LEFT_Y_LABEL,
  CHART_MARGIN_RIGHT_Y_LABEL,
  CHART_PLOT_HEIGHT_PX,
  yAxisLabelInsideLeft,
  yAxisLabelInsideRight,
} from '@/app/utils/chartAxisConfig';

const PRECIP_HUM_FIELDS = [
  { dataKey: 'precipitation_rate', sensorKey: 'precipitation_rate' },
  { dataKey: 'humidity_weather', sensorKey: 'humidity_weather' },
] as const;

const PrecipitationHumidityGraph = ({ data }: { data: any }) => {
  const t = useTranslations();
  const { colorMode } = useColorMode();
  const { textColor } = useColorModeStyles();
  const { axis, tickFill, grid } = useChartAxisColors();
  useUnitOverridesRevision();

  const chartBg = colorMode === 'light' ? 'white' : 'gray.800';
  const loading = !data;
  const empty =
    !!data &&
    (!data.sensor_data ||
      (Array.isArray(data.sensor_data) && data.sensor_data.length === 0));

  const chartRows = useCalibratedStationChartRows(
    data?.sensor_data,
    PRECIP_HUM_FIELDS
  );
  const chartData = useMemo(
    () => addTimeMsToChartRows(chartRows, 'timestamp'),
    [chartRows]
  );
  const xAxisProps = mergeAxisTheme(
    getAdaptiveTimeXAxisProps(chartData, 'timestamp'),
    axis,
    tickFill
  );
  const yPrecip = mergeAxisTheme(getDefaultYAxisProps(2), axis, tickFill);
  const yHum = mergeAxisTheme(getDefaultYAxisProps(0), axis, tickFill);
  const precipUnit = resolveAxisUnit('precipitation_rate');
  const humUnit = resolveAxisUnit('humidity_weather');

  const [seriesVisible, setSeriesVisible] = useState({
    precipitation_rate: true,
    humidity_weather: true,
  });

  const handleLegendClick = (e: ChartLegendPayloadEntry) => {
    const k = e.dataKey;
    if (k !== 'precipitation_rate' && k !== 'humidity_weather') return;
    setSeriesVisible((p) => ({ ...p, [k]: !p[k as keyof typeof p] }));
  };

  const hiddenLegendKeys = Object.entries(seriesVisible)
    .filter(([, on]) => !on)
    .map(([key]) => key) as string[];

  return (
    <Box
      width="100%"
      height="100%"
      bg={chartBg}
      borderRadius="md"
      boxShadow="lg"
      p={2}
    >
      <Box mb={4}>
        <ChartPanelHeading
          title={t('station.precipitationHumidity.title')}
          subtitle={data?.sensor_names?.precipitation_humidity_rate}
          color={textColor}
        />
      </Box>
      <ChartStateView
        loading={loading}
        empty={empty}
        height={CHART_PLOT_HEIGHT_PX}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 12,
              right: CHART_MARGIN_RIGHT_Y_LABEL,
              left: CHART_MARGIN_LEFT_Y_LABEL,
              bottom: 8,
            }}
          >
            <CartesianGrid {...themedCartesianGrid(grid)} />
            <XAxis {...xAxisProps} />
            <YAxis
              yAxisId="left"
              {...yPrecip}
              label={yAxisLabelInsideLeft(
                `${t('station.precipitationHumidity.precipAxis')} (${precipUnit})`,
                tickFill
              )}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              {...yHum}
              label={yAxisLabelInsideRight(
                `${t('station.precipitationHumidity.humidityAxis')} (${humUnit})`,
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
              dataKey="precipitation_rate"
              stroke={data.sensor_colors?.precipitation_rate_color}
              name={`${t('sensors.precipitation_rate')} (${precipUnit})`}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={activeDotForSeries(
                data.sensor_colors?.precipitation_rate_color ?? '#38bdf8'
              )}
              hide={!seriesVisible.precipitation_rate}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="humidity_weather"
              stroke={data.sensor_colors?.humidity_weather_color}
              name={`${t('sensors.humidity_weather')} (${humUnit})`}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={activeDotForSeries(
                data.sensor_colors?.humidity_weather_color ?? '#6366f1'
              )}
              hide={!seriesVisible.humidity_weather}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartStateView>
    </Box>
  );
};

export default PrecipitationHumidityGraph;
