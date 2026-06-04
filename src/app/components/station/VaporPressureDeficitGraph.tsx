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
  CHART_PLOT_HEIGHT_PX,
  yAxisLabelInsideLeft,
} from '@/app/utils/chartAxisConfig';

const VPD_FIELDS = [
  { dataKey: 'pressure_weather', sensorKey: 'pressure_weather' },
] as const;

const VaporPressureDeficitGraph = ({ data }: { data: any }) => {
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
    VPD_FIELDS
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
  const yProps = mergeAxisTheme(getDefaultYAxisProps(2), axis, tickFill);
  const pressUnit = resolveAxisUnit('pressure_weather');

  const [showSeries, setShowSeries] = useState(true);

  const handleLegendClick = (e: ChartLegendPayloadEntry) => {
    if (e.dataKey !== 'pressure_weather') return;
    setShowSeries((s) => !s);
  };

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
          title={t('station.vpd.title')}
          subtitle={data?.sensor_names?.pressure_weather}
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
                `${t('station.vpd.vpdAxis')} (${pressUnit})`,
                tickFill
              )}
            />
            <Tooltip content={<UnifiedTooltip valuesAlreadyCalibrated />} />
            <Legend
              wrapperStyle={defaultLegendWrapperStyle}
              content={
                <ChartLegend
                  onClick={handleLegendClick}
                  hiddenDataKeys={showSeries ? [] : ['pressure_weather']}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="pressure_weather"
              stroke={data.sensor_colors?.pressure_weather_color}
              name={`${t('sensors.pressure_weather')} (${pressUnit})`}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={activeDotForSeries(
                data.sensor_colors?.pressure_weather_color ?? '#22c55e'
              )}
              hide={!showSeries}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartStateView>
    </Box>
  );
};

export default VaporPressureDeficitGraph;
