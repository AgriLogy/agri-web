'use client';
import { Box } from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
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

const WIND_SPEED_FIELDS = [
  { dataKey: 'wind_speed', sensorKey: 'wind_speed' },
] as const;

const WindSpeedGraph = ({ data }: { data: any }) => {
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
    WIND_SPEED_FIELDS
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
  const yProps = mergeAxisTheme(getDefaultYAxisProps(1), axis, tickFill);
  const windUnit = resolveAxisUnit('wind_speed');

  const [showSeries, setShowSeries] = useState(true);

  const handleLegendClick = (e: ChartLegendPayloadEntry) => {
    if (e.dataKey !== 'wind_speed') return;
    setShowSeries((s) => !s);
  };

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
          title={t('station.windSpeed.title')}
          subtitle={data?.sensor_names?.wind_speed}
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
                t('station.windSpeed.axis', { unit: windUnit }),
                tickFill
              )}
            />
            <Tooltip content={<UnifiedTooltip valuesAlreadyCalibrated />} />
            <Legend
              wrapperStyle={defaultLegendWrapperStyle}
              content={
                <ChartLegend
                  onClick={handleLegendClick}
                  hiddenDataKeys={showSeries ? [] : ['wind_speed']}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="wind_speed"
              stroke={data.sensor_colors?.wind_speed_color}
              name={t('station.windSpeed.series', { unit: windUnit })}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={activeDotForSeries(
                data.sensor_colors?.wind_speed_color ?? '#14b8a6'
              )}
              hide={!showSeries}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartStateView>
    </Box>
  );
};

export default WindSpeedGraph;
