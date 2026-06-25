import React, { useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Box, Button, Flex, HStack } from '@chakra-ui/react';
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
  activeDotForSeries,
  addTimeMsToChartRows,
  defaultLegendWrapperStyle,
  getAdaptiveTimeXAxisProps,
  getDefaultYAxisProps,
  mergeAxisTheme,
  themedCartesianGrid,
  getChartMarginLeft,
  CHART_PLOT_HEIGHT_PX,
  analyticsChartPanelLayoutProps,
  yAxisLabelInsideLeft,
} from '@/app/utils/chartAxisConfig';
import { colorForSensor } from '@agri/ui';

const SolarRadiationChart = ({
  data,
  loading,
}: {
  data: SensorData[];
  loading: boolean;
}) => {
  const t = useTranslations();
  const chartRef = useRef<HTMLDivElement>(null);
  const [showArea, setShowArea] = useState(true);
  const unitRev = useUnitOverridesRevision();

  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      const ta = Date.parse(a.timestamp);
      const tb = Date.parse(b.timestamp);
      if (!Number.isFinite(ta) || !Number.isFinite(tb)) return 0;
      return ta - tb;
    });
    const rows = sorted.map((item) => ({
      name: item.timestamp,
      solar_radiation: calibrateChartValue('solar_radiation', item.value),
      default_unit: item.default_unit,
    }));
    return addTimeMsToChartRows(rows, 'name');
  }, [data, unitRev]);

  const { textColor } = useColorModeStyles();
  const { axis, tickFill, grid } = useChartAxisColors();
  const xAxisProps = mergeAxisTheme(
    getAdaptiveTimeXAxisProps(chartData, 'name'),
    axis,
    tickFill
  );
  const yAxisProps = mergeAxisTheme(getDefaultYAxisProps(0), axis, tickFill);
  const solarUnit = resolveAxisUnit('solar_radiation', data[0]?.default_unit);

  const handleLegendClick = (payload: ChartLegendPayloadEntry) => {
    if (payload.dataKey === 'solar_radiation') {
      setShowArea((prev) => !prev);
    }
  };

  const handleScreenshot = async () => {
    if (chartRef.current) {
      const canvas = await html2canvas(chartRef.current);
      const link = document.createElement('a');
      link.download = 'solar_radiation_chart.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const handleDownloadData = () => {
    const csv =
      'timestamp,solar_radiation\n' +
      chartData.map((d) => `${d.name},${d.solar_radiation}`).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'solar_radiation_data.csv';
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
          title={t('analytics.solarRadiation.title')}
          subtitle={t('analytics.solarRadiation.subtitle')}
        />
        <HStack spacing={2}>
          <Button
            aria-label={t('analytics.common.captureChart')}
            variant="ghost"
            onClick={handleScreenshot}
          >
            <FaCamera />
          </Button>
          <Button
            aria-label={t('analytics.common.exportCsv')}
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
          <AreaChart
            data={chartData}
            margin={{
              top: 12,
              right: 12,
              left: getChartMarginLeft(),
              bottom: 8,
            }}
          >
            <CartesianGrid {...themedCartesianGrid(grid)} />
            <XAxis {...xAxisProps} />
            <YAxis
              {...yAxisProps}
              label={yAxisLabelInsideLeft(solarUnit, tickFill)}
            />
            <Tooltip content={<UnifiedTooltip valuesAlreadyCalibrated />} />
            <Legend
              wrapperStyle={defaultLegendWrapperStyle}
              content={
                <ChartLegend
                  onClick={handleLegendClick}
                  hiddenDataKeys={showArea ? [] : ['solar_radiation']}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="solar_radiation"
              name={`${t('sensors.solar_radiation')} (${solarUnit})`}
              hide={!showArea}
              stroke={colorForSensor('solar_radiation')}
              fill={colorForSensor('solar_radiation')}
              fillOpacity={0.38}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={activeDotForSeries(colorForSensor('solar_radiation'))}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartStateView>
    </Box>
  );
};

export default SolarRadiationChart;
