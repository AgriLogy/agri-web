import {
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Area,
} from 'recharts';
import { Box, Button, Flex, HStack } from '@chakra-ui/react';
import { useRef, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useUnitOverridesRevision } from '@/app/hooks/useUnitOverridesRevision';
import { calibrateChartValue } from '@/app/utils/chartSeriesCalibration';
import { calibratedValueInAxisUnit } from '@/app/utils/calibratedValueInAxisUnit';
import {
  compactResolvedAxisUnits,
  formatCalibratedReading,
  resolveAxisUnit,
} from '@/app/utils/unitOverrides';
import html2canvas from 'html2canvas';
import { FaCamera, FaDownload } from 'react-icons/fa';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import type { WaterSoilData } from '@/app/types';
import ChartPanelHeading from '../../common/ChartPanelHeading';
import ChartStateView from '../../common/ChartStateView';
import UnifiedTooltip, {
  type UnifiedTooltipPayloadItem,
} from '../../common/UnifiedTooltip';
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
  getChartMarginRight,
  CHART_PLOT_HEIGHT_PX,
  analyticsChartPanelLayoutProps,
  yAxisLabelInsideLeft,
  yAxisLabelInsideRight,
} from '@/app/utils/chartAxisConfig';
import { colorForSensor, chartSeries } from '@agri/ui';

const MOISTURE_AXIS_UNIT = '%';

/** Débit (eau) — même bleu pour trait, remplissage et hover */
const WATER_FLOW_BLUE = colorForSensor('waterFlow');

const WaterSoilChart = ({
  data,
  waterFlowDefaultUnit,
  loading = false,
}: {
  data: WaterSoilData[];
  waterFlowDefaultUnit?: string;
  loading?: boolean;
}) => {
  const t = useTranslations();
  const unitRev = useUnitOverridesRevision();

  const displayData = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        rawSoilLow: d.soilLow,
        rawSoilMedium: d.soilMedium,
        rawSoilHigh: d.soilHigh,
        rawWaterFlow: d.waterFlow,
        soilLow:
          d.soilLow != null && Number.isFinite(d.soilLow)
            ? calibratedValueInAxisUnit(
                'soil_moisture_low',
                d.soilLow,
                MOISTURE_AXIS_UNIT,
                MOISTURE_AXIS_UNIT
              )
            : d.soilLow,
        soilMedium:
          d.soilMedium != null && Number.isFinite(d.soilMedium)
            ? calibratedValueInAxisUnit(
                'soil_moisture_medium',
                d.soilMedium,
                MOISTURE_AXIS_UNIT,
                MOISTURE_AXIS_UNIT
              )
            : d.soilMedium,
        soilHigh:
          d.soilHigh != null && Number.isFinite(d.soilHigh)
            ? calibratedValueInAxisUnit(
                'soil_moisture_high',
                d.soilHigh,
                MOISTURE_AXIS_UNIT,
                MOISTURE_AXIS_UNIT
              )
            : d.soilHigh,
        waterFlow:
          d.waterFlow != null && Number.isFinite(d.waterFlow)
            ? calibrateChartValue('water_flow', d.waterFlow)
            : d.waterFlow,
      })),
    [data, unitRev]
  );

  const chartRows = useMemo(
    () => addTimeMsToChartRows(displayData, 'timestamp'),
    [displayData]
  );

  const { axis, tickFill, grid } = useChartAxisColors();
  const xAxisProps = mergeAxisTheme(
    getAdaptiveTimeXAxisProps(chartRows, 'timestamp'),
    axis,
    tickFill
  );

  const flowUnit = resolveAxisUnit('water_flow', waterFlowDefaultUnit);
  const humLowUnit = resolveAxisUnit('soil_moisture_low');
  const humMedUnit = resolveAxisUnit('soil_moisture_medium');
  const humHighUnit = resolveAxisUnit('soil_moisture_high');
  const humidityAxisUnits = compactResolvedAxisUnits(
    ['soil_moisture_low', 'soil_moisture_medium', 'soil_moisture_high'],
    MOISTURE_AXIS_UNIT
  );

  const yAxisMoist = mergeAxisTheme(getDefaultYAxisProps(0), axis, tickFill);
  const yAxisFlow = mergeAxisTheme(getDefaultYAxisProps(2), axis, tickFill);

  const chartRef = useRef<HTMLDivElement>(null);

  const [seriesVisible, setSeriesVisible] = useState({
    waterFlow: true,
    soilLow: true,
    soilMedium: true,
    soilHigh: true,
  });

  const handleLegendClick = (e: ChartLegendPayloadEntry) => {
    const k = e.dataKey;
    if (
      k !== 'waterFlow' &&
      k !== 'soilLow' &&
      k !== 'soilMedium' &&
      k !== 'soilHigh'
    )
      return;
    setSeriesVisible((p) => ({ ...p, [k]: !p[k as keyof typeof p] }));
  };

  const hiddenLegendKeys = Object.entries(seriesVisible)
    .filter(([, on]) => !on)
    .map(([key]) => key) as string[];

  const handleScreenshot = async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current);
    const link = document.createElement('a');
    link.download = 'water_soil_data.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleDownloadData = () => {
    const headers = [
      'timestamp',
      'soilLow',
      'soilMedium',
      'soilHigh',
      'waterFlow',
    ];
    const csv =
      headers.join(',') +
      '\n' +
      displayData
        .map((d) =>
          [
            d.timestamp,
            d.soilLow ?? '',
            d.soilMedium ?? '',
            d.soilHigh ?? '',
            d.waterFlow ?? '',
          ].join(',')
        )
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'water_soil_data.csv';
    link.click();

    URL.revokeObjectURL(url);
  };

  const { textColor } = useColorModeStyles();

  return (
    <Box {...analyticsChartPanelLayoutProps} maxW="100%" minW={0}>
      <Flex
        justify="space-between"
        align={{ base: 'flex-start', md: 'center' }}
        gap={2}
        mb={2}
      >
        <ChartPanelHeading
          color={textColor}
          title={t('analytics.soilWater.chartTitle')}
          subtitle={t('analytics.soilWater.chartSubtitle', {
            humidityUnit: humidityAxisUnits,
            flowUnit,
          })}
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
        empty={!displayData?.length}
        emptyText={t('analytics.common.noData')}
        chartRef={chartRef}
        height={CHART_PLOT_HEIGHT_PX}
      >
        <ResponsiveContainer width="100%" height="100%" minHeight={0}>
          <ComposedChart
            data={chartRows}
            margin={{
              top: 12,
              right: getChartMarginRight(),
              left: getChartMarginLeft(),
              bottom: 8,
            }}
          >
            <CartesianGrid {...themedCartesianGrid(grid)} />

            <XAxis {...xAxisProps} />
            <YAxis
              yAxisId="left"
              domain={['auto', 'auto']}
              {...yAxisMoist}
              label={yAxisLabelInsideLeft(
                t('analytics.soilWater.axisHumidity', {
                  unit: humidityAxisUnits,
                }),
                tickFill
              )}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 'auto']}
              {...yAxisFlow}
              label={yAxisLabelInsideRight(
                t('analytics.soilWater.axisFlow', { unit: flowUnit }),
                tickFill
              )}
            />

            <Tooltip
              content={({ active, payload, label }) => (
                <UnifiedTooltip
                  active={active}
                  label={label}
                  payload={payload as UnifiedTooltipPayloadItem[] | undefined}
                  valueFormatter={(_value, _name, item) => {
                    const p = item.payload as Record<string, unknown>;
                    const dk = String(item.dataKey ?? '');
                    if (
                      dk === 'soilLow' &&
                      typeof p.rawSoilLow === 'number' &&
                      Number.isFinite(p.rawSoilLow)
                    ) {
                      return `${formatCalibratedReading('soil_moisture_low', p.rawSoilLow)} ${humLowUnit}`.trim();
                    }
                    if (
                      dk === 'soilMedium' &&
                      typeof p.rawSoilMedium === 'number' &&
                      Number.isFinite(p.rawSoilMedium)
                    ) {
                      return `${formatCalibratedReading('soil_moisture_medium', p.rawSoilMedium)} ${humMedUnit}`.trim();
                    }
                    if (
                      dk === 'soilHigh' &&
                      typeof p.rawSoilHigh === 'number' &&
                      Number.isFinite(p.rawSoilHigh)
                    ) {
                      return `${formatCalibratedReading('soil_moisture_high', p.rawSoilHigh)} ${humHighUnit}`.trim();
                    }
                    if (
                      dk === 'waterFlow' &&
                      typeof p.rawWaterFlow === 'number' &&
                      Number.isFinite(p.rawWaterFlow)
                    ) {
                      return `${formatCalibratedReading('water_flow', p.rawWaterFlow)} ${flowUnit}`.trim();
                    }
                    const n =
                      typeof _value === 'number' ? _value : Number(_value);
                    return Number.isFinite(n)
                      ? n.toFixed(2)
                      : String(_value ?? '—');
                  }}
                />
              )}
            />
            <Legend
              wrapperStyle={defaultLegendWrapperStyle}
              content={(legendProps) => (
                <ChartLegend
                  onClick={handleLegendClick}
                  hiddenDataKeys={hiddenLegendKeys}
                  payload={
                    legendProps.payload as ChartLegendPayloadEntry[] | undefined
                  }
                />
              )}
            />

            <Area
              yAxisId="right"
              type="monotone"
              dataKey="waterFlow"
              name={`${t('sensors.water_flow')} (${flowUnit})`}
              stroke={WATER_FLOW_BLUE}
              strokeWidth={2.5}
              strokeOpacity={1}
              fill={chartSeries.cobaltFill}
              fillOpacity={1}
              strokeLinecap="round"
              strokeLinejoin="round"
              connectNulls
              dot={false}
              activeDot={activeDotForSeries(WATER_FLOW_BLUE)}
              isAnimationActive={false}
              hide={!seriesVisible.waterFlow}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="soilLow"
              name={t('analytics.soilWater.seriesLow', { unit: humLowUnit })}
              stroke={colorForSensor('soilLow')}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={activeDotForSeries(colorForSensor('soilLow'))}
              hide={!seriesVisible.soilLow}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="soilMedium"
              name={t('analytics.soilWater.seriesMedium', { unit: humMedUnit })}
              stroke={colorForSensor('soilMedium')}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={activeDotForSeries(colorForSensor('soilMedium'))}
              hide={!seriesVisible.soilMedium}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="soilHigh"
              name={t('analytics.soilWater.seriesHigh', { unit: humHighUnit })}
              stroke={colorForSensor('soilHigh')}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={activeDotForSeries(colorForSensor('soilHigh'))}
              hide={!seriesVisible.soilHigh}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartStateView>
    </Box>
  );
};

export default WaterSoilChart;
