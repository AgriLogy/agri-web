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
import { Box, Button, Flex, HStack } from '@chakra-ui/react';
import { FaCamera, FaDownload } from 'react-icons/fa';
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
  getChartMarginLeft,
  getChartMarginRight,
  CHART_PLOT_HEIGHT_PX,
  analyticsChartPanelLayoutProps,
  yAxisLabelInsideLeft,
  yAxisLabelInsideRight,
} from '@/app/utils/chartAxisConfig';
import { colorForSensor } from '@agri/ui';

type Props = {
  salinityData: SensorData[];
  conductivityData: SensorData[];
  loading: boolean;
};

const SoilSalinityConductivityChart = ({
  salinityData,
  conductivityData,
  loading,
}: Props) => {
  const t = useTranslations();
  const chartRef = useRef<HTMLDivElement>(null);
  const { textColor } = useColorModeStyles();
  const { axis, tickFill, grid } = useChartAxisColors();
  const unitRev = useUnitOverridesRevision();

  const [activeLines, setActiveLines] = useState({
    soil_salinity: true,
    soil_conductivity: true,
  });

  const chartData = useMemo(() => {
    const timestamps = Array.from(
      new Set([
        ...salinityData.map((d) => d.timestamp),
        ...conductivityData.map((d) => d.timestamp),
      ])
    ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    return timestamps.map((timestamp) => {
      const sal = salinityData.find((d) => d.timestamp === timestamp);
      const cond = conductivityData.find((d) => d.timestamp === timestamp);
      const sv = sal?.value;
      const cv = cond?.value;
      return {
        name: timestamp,
        soil_salinity:
          sv != null && Number.isFinite(sv)
            ? calibrateChartValue('soil_salinity', sv)
            : null,
        salinity_color: sal?.color,
        salinity_courbe_name: sal?.courbe_name,
        soil_conductivity:
          cv != null && Number.isFinite(cv)
            ? calibrateChartValue('soil_conductivity', cv)
            : null,
        conductivity_color: cond?.color,
        conductivity_courbe_name: cond?.courbe_name,
      };
    });
  }, [salinityData, conductivityData, unitRev]);

  const chartRows = useMemo(
    () => addTimeMsToChartRows(chartData, 'name'),
    [chartData]
  );

  const xAxisProps = mergeAxisTheme(
    getAdaptiveTimeXAxisProps(chartRows, 'name'),
    axis,
    tickFill
  );
  const ySal = mergeAxisTheme(getDefaultYAxisProps(0), axis, tickFill);
  const yCond = mergeAxisTheme(getDefaultYAxisProps(0), axis, tickFill);

  const salinityUnit = resolveAxisUnit(
    'soil_salinity',
    salinityData[0]?.default_unit
  );
  const conductivityUnit = resolveAxisUnit(
    'soil_conductivity',
    conductivityData[0]?.default_unit
  );

  const handleLegendClick = (e: ChartLegendPayloadEntry) => {
    const key = e.dataKey as keyof typeof activeLines | undefined;
    if (key === 'soil_salinity' || key === 'soil_conductivity') {
      setActiveLines((prev) => ({
        ...prev,
        [key]: !prev[key],
      }));
    }
  };

  const hiddenLegendKeys = (
    ['soil_salinity', 'soil_conductivity'] as const
  ).filter((k) => !activeLines[k]);

  const handleScreenshot = async () => {
    if (chartRef.current) {
      const canvas = await html2canvas(chartRef.current);
      const link = document.createElement('a');
      link.download = 'soil_salinity_conductivity_chart.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const handleDownloadData = () => {
    const csv =
      'timestamp,soil_salinity,soil_conductivity\n' +
      chartData
        .map(
          (d) =>
            `${d.name},${d.soil_salinity ?? ''},${d.soil_conductivity ?? ''}`
        )
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'soil_data.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

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
          title={t('analytics.soilSalinityConductivity.title')}
          subtitle={t('analytics.soilSalinityConductivity.subtitle')}
        />
        <HStack spacing={2}>
          <Button onClick={handleScreenshot} variant="ghost">
            <FaCamera />
          </Button>
          <Button onClick={handleDownloadData} variant="ghost">
            <FaDownload />
          </Button>
        </HStack>
      </Flex>

      <ChartStateView
        loading={loading}
        empty={chartRows.length === 0}
        chartRef={chartRef}
        height={CHART_PLOT_HEIGHT_PX}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
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
              yAxisId="salinity"
              {...ySal}
              label={yAxisLabelInsideLeft(
                t('analytics.soilSalinityConductivity.salinityAxisLabel', {
                  unit: salinityUnit,
                }),
                tickFill
              )}
            />
            <YAxis
              yAxisId="conductivity"
              orientation="right"
              {...yCond}
              label={yAxisLabelInsideRight(
                t('analytics.soilSalinityConductivity.conductivityAxisLabel', {
                  unit: conductivityUnit,
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
                  hiddenDataKeys={[...hiddenLegendKeys]}
                />
              }
            />

            <Line
              yAxisId="salinity"
              type="monotone"
              dataKey="soil_salinity"
              name={`${chartData[0]?.salinity_courbe_name ?? t('analytics.soilSalinityConductivity.salinity')} (${salinityUnit})`}
              hide={!activeLines.soil_salinity}
              stroke={
                chartData[0]?.salinity_color || colorForSensor('soil_salinity')
              }
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={activeDotForSeries(
                chartData[0]?.salinity_color || colorForSensor('soil_salinity')
              )}
            />

            <Line
              yAxisId="conductivity"
              type="monotone"
              dataKey="soil_conductivity"
              name={`${chartData[0]?.conductivity_courbe_name ?? t('analytics.soilSalinityConductivity.conductivity')} (${conductivityUnit})`}
              hide={!activeLines.soil_conductivity}
              stroke={
                chartData[0]?.conductivity_color ||
                colorForSensor('soil_conductivity')
              }
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={activeDotForSeries(
                chartData[0]?.conductivity_color ||
                  colorForSensor('soil_conductivity')
              )}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartStateView>
    </Box>
  );
};

export default SoilSalinityConductivityChart;
