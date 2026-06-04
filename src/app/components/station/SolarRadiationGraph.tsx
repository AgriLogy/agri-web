'use client';
import { Box, Text, HStack, useColorMode } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useCalibratedStationChartRows } from '@/app/hooks/useCalibratedStationChartRows';
import { useUnitOverridesRevision } from '@/app/hooks/useUnitOverridesRevision';
import { resolveAxisUnit } from '@/app/utils/unitOverrides';
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
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
  CHART_TIME_MS_KEY,
  defaultLegendWrapperStyle,
  getAdaptiveTimeXAxisProps,
  getDefaultYAxisProps,
  mergeAxisTheme,
  themedCartesianGrid,
  CHART_MARGIN_LEFT_Y_LABEL,
  CHART_PLOT_HEIGHT_PX,
  yAxisLabelInsideLeft,
} from '@/app/utils/chartAxisConfig';

const SOLAR_FIELDS = [
  { dataKey: 'solar_radiation', sensorKey: 'solar_radiation' },
] as const;

const SolarRadiationGraph = ({ data }: { data: any }) => {
  const t = useTranslations();
  const { colorMode } = useColorMode();
  const { textColor } = useColorModeStyles();
  const { axis, tickFill, grid } = useChartAxisColors();
  useUnitOverridesRevision();

  const loading = !data;
  const empty =
    !!data &&
    (!data.sensor_data ||
      (Array.isArray(data.sensor_data) && data.sensor_data.length === 0));

  const chartRowsRaw = useCalibratedStationChartRows(
    data?.sensor_data,
    SOLAR_FIELDS
  );
  const chartRows = useMemo(
    () => addTimeMsToChartRows(chartRowsRaw, 'timestamp'),
    [chartRowsRaw]
  );
  const solarUnit = resolveAxisUnit('solar_radiation');

  const xAxisProps = mergeAxisTheme(
    getAdaptiveTimeXAxisProps(chartRows, 'timestamp'),
    axis,
    tickFill
  );
  const isNumericTimeX =
    'type' in xAxisProps && (xAxisProps as { type?: string }).type === 'number';

  const yCeiling = useMemo(() => {
    const vals = chartRows
      .map((r) => Number((r as Record<string, unknown>).solar_radiation))
      .filter((n) => Number.isFinite(n));
    if (!vals.length) return 800;
    const mx = Math.max(...vals);
    return Math.max(120, Math.ceil(mx * 1.08));
  }, [chartRows]);

  const yBandCritique = yCeiling * 0.9;

  const xKeyStartRaw = chartRows[0]?.timestamp;
  const xKeyEndRaw = chartRows[chartRows.length - 1]?.timestamp;
  const xKeyStart = typeof xKeyStartRaw === 'string' ? xKeyStartRaw : undefined;
  const xKeyEnd = typeof xKeyEndRaw === 'string' ? xKeyEndRaw : undefined;
  const xMsStart = chartRows[0]?.[CHART_TIME_MS_KEY];
  const xMsEnd = chartRows[chartRows.length - 1]?.[CHART_TIME_MS_KEY];

  const yProps = mergeAxisTheme(getDefaultYAxisProps(0), axis, tickFill);

  const chartBg = colorMode === 'light' ? 'white' : 'gray.800';
  const subtitleColor = colorMode === 'light' ? 'gray.500' : 'gray.400';

  const [showSeries, setShowSeries] = useState(true);

  const handleLegendClick = (e: ChartLegendPayloadEntry) => {
    if (e.dataKey !== 'solar_radiation') return;
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
      <Box mb={2}>
        <ChartPanelHeading
          title={t('station.solarRadiation.title')}
          subtitle={
            [
              t('station.solarRadiation.bandsCaption'),
              data?.sensor_names?.solar_radiation,
            ]
              .filter(Boolean)
              .join(' · ') || undefined
          }
          color={textColor}
        />
      </Box>
      <HStack spacing={3} mb={2} flexWrap="wrap">
        <HStack spacing={1}>
          <Box
            w="10px"
            h="10px"
            bg="#f97316"
            opacity={0.35}
            borderRadius="sm"
          />
          <Text fontSize="xs" color={subtitleColor}>
            0–90 %
          </Text>
        </HStack>
        <HStack spacing={1}>
          <Box
            w="10px"
            h="10px"
            bg="#22c55e"
            opacity={0.35}
            borderRadius="sm"
          />
          <Text fontSize="xs" color={subtitleColor}>
            90–100 %
          </Text>
        </HStack>
      </HStack>
      <ChartStateView
        loading={loading}
        empty={empty}
        height={CHART_PLOT_HEIGHT_PX}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartRows}
            margin={{
              top: 8,
              right: 8,
              left: CHART_MARGIN_LEFT_Y_LABEL,
              bottom: 8,
            }}
          >
            <defs>
              <linearGradient
                id="stationSolarMountain"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={
                    data.sensor_colors?.solar_radiation_color ?? '#eab308'
                  }
                  stopOpacity={0.42}
                />
                <stop
                  offset="100%"
                  stopColor={
                    data.sensor_colors?.solar_radiation_color ?? '#eab308'
                  }
                  stopOpacity={0.04}
                />
              </linearGradient>
            </defs>
            <CartesianGrid {...themedCartesianGrid(grid)} />
            {isNumericTimeX &&
            typeof xMsStart === 'number' &&
            typeof xMsEnd === 'number' ? (
              <>
                <ReferenceArea
                  x1={xMsStart}
                  x2={xMsEnd}
                  y1={0}
                  y2={yBandCritique}
                  fill="#f97316"
                  fillOpacity={0.09}
                  strokeOpacity={0}
                  ifOverflow="hidden"
                />
                <ReferenceArea
                  x1={xMsStart}
                  x2={xMsEnd}
                  y1={yBandCritique}
                  y2={yCeiling}
                  fill="#22c55e"
                  fillOpacity={0.08}
                  strokeOpacity={0}
                  ifOverflow="hidden"
                />
              </>
            ) : (
              xKeyStart != null &&
              xKeyEnd != null && (
                <>
                  <ReferenceArea
                    x1={xKeyStart}
                    x2={xKeyEnd}
                    y1={0}
                    y2={yBandCritique}
                    fill="#f97316"
                    fillOpacity={0.09}
                    strokeOpacity={0}
                    ifOverflow="hidden"
                  />
                  <ReferenceArea
                    x1={xKeyStart}
                    x2={xKeyEnd}
                    y1={yBandCritique}
                    y2={yCeiling}
                    fill="#22c55e"
                    fillOpacity={0.08}
                    strokeOpacity={0}
                    ifOverflow="hidden"
                  />
                </>
              )
            )}
            <XAxis {...xAxisProps} />
            <YAxis
              {...yProps}
              domain={[0, yCeiling]}
              label={yAxisLabelInsideLeft(solarUnit, tickFill)}
            />
            <Tooltip content={<UnifiedTooltip valuesAlreadyCalibrated />} />
            <Legend
              wrapperStyle={defaultLegendWrapperStyle}
              content={
                <ChartLegend
                  onClick={handleLegendClick}
                  hiddenDataKeys={showSeries ? [] : ['solar_radiation']}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="solar_radiation"
              stroke={data.sensor_colors?.solar_radiation_color ?? '#ca8a04'}
              fill="url(#stationSolarMountain)"
              name={`${t('sensors.solar_radiation')} (${solarUnit})`}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={activeDotForSeries(
                data.sensor_colors?.solar_radiation_color ?? '#ca8a04'
              )}
              isAnimationActive={false}
              hide={!showSeries}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartStateView>
    </Box>
  );
};

export default SolarRadiationGraph;
