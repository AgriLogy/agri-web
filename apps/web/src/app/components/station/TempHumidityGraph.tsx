'use client';
import { Box } from '@chakra-ui/react';
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

const TEMP_HUM_FIELDS = [
  { dataKey: 'temperature_weather', sensorKey: 'temperature_weather' },
  { dataKey: 'humidity_weather', sensorKey: 'humidity_weather' },
] as const;

const TempHumidityGraph = ({ data }: { data: any }) => {
  const t = useTranslations();
  const { bg, textColor } = useColorModeStyles();
  const { axis, tickFill, grid } = useChartAxisColors();
  useUnitOverridesRevision();

  const loading = !data;
  const empty =
    !!data &&
    (!data.sensor_data ||
      (Array.isArray(data.sensor_data) && data.sensor_data.length === 0));

  const chartRows = useCalibratedStationChartRows(
    data?.sensor_data,
    TEMP_HUM_FIELDS
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
  const yTemp = mergeAxisTheme(getDefaultYAxisProps(1), axis, tickFill);
  const yHum = mergeAxisTheme(getDefaultYAxisProps(0), axis, tickFill);
  const tempUnit = resolveAxisUnit('temperature_weather');
  const humUnit = resolveAxisUnit('humidity_weather');

  const [seriesVisible, setSeriesVisible] = useState({
    temperature_weather: true,
    humidity_weather: true,
  });

  const handleLegendClick = (e: ChartLegendPayloadEntry) => {
    const k = e.dataKey;
    if (k !== 'temperature_weather' && k !== 'humidity_weather') return;
    setSeriesVisible((p) => ({ ...p, [k]: !p[k as keyof typeof p] }));
  };

  const hiddenLegendKeys = Object.entries(seriesVisible)
    .filter(([, on]) => !on)
    .map(([key]) => key) as string[];

  return (
    <Box
      width="100%"
      height="100%"
      bg={bg}
      borderRadius="md"
      boxShadow="lg"
      p={2}
    >
      <Box mb={4}>
        <ChartPanelHeading
          title={t('station.tempHumidity.title')}
          subtitle={data?.sensor_names?.temperature_humidity_weather}
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
              {...yTemp}
              label={yAxisLabelInsideLeft(
                `${t('station.tempHumidity.tempAxis')} (${tempUnit})`,
                tickFill
              )}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              {...yHum}
              label={yAxisLabelInsideRight(
                `${t('station.tempHumidity.humidityAxis')} (${humUnit})`,
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
              dataKey="temperature_weather"
              stroke={data.sensor_colors?.temperature_weather_color}
              name={`${t('sensors.temperature_weather')} (${tempUnit})`}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={activeDotForSeries(
                data.sensor_colors?.temperature_weather_color ?? '#d97706'
              )}
              hide={!seriesVisible.temperature_weather}
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
                data.sensor_colors?.humidity_weather_color ?? '#0d9488'
              )}
              hide={!seriesVisible.humidity_weather}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartStateView>
    </Box>
  );
};

export default TempHumidityGraph;
