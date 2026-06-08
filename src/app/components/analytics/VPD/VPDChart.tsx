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
import { Box, Flex, Button, HStack, Icon } from '@chakra-ui/react';
import { FaDownload, FaCamera, FaLeaf } from 'react-icons/fa';
import html2canvas from 'html2canvas';
import ChartPanelHeading from '../../common/ChartPanelHeading';
import ChartStateView from '../../common/ChartStateView';
import ChartLegend, {
  type ChartLegendPayloadEntry,
} from '../../common/ChartLegend';
import UnifiedTooltip from '../../common/UnifiedTooltip';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import { useUnitOverridesRevision } from '@/app/hooks/useUnitOverridesRevision';
import { resolveAxisUnit } from '@/app/utils/unitOverrides';
import { formatNumber } from '@/app/utils/formatNumber';
import { useChartAxisColors } from '@/app/utils/useChartAxisColors';
import {
  activeDotForSeries,
  addTimeMsToChartRows,
  defaultLegendWrapperStyle,
  defaultLineProps,
  defaultTooltipCursor,
  getAdaptiveTimeXAxisProps,
  getDefaultYAxisProps,
  mergeAxisTheme,
  themedCartesianGrid,
  getChartMarginLeft,
  CHART_PLOT_HEIGHT_VPD_PX,
  analyticsChartPanelLayoutProps,
  yAxisLabelInsideLeft,
} from '@/app/utils/chartAxisConfig';

export interface VPDDataPoint {
  timestamp: string;
  vpd: number;
}

const VPDChart = ({
  data,
  loading,
}: {
  data: VPDDataPoint[];
  loading: boolean;
}) => {
  const t = useTranslations();
  const chartRef = useRef<HTMLDivElement>(null);
  const { textColor } = useColorModeStyles();
  useUnitOverridesRevision();
  const vpdUnit = resolveAxisUnit('vpd');
  const legendName = t('analytics.vpd.legendName');

  const chartData = useMemo(
    () => addTimeMsToChartRows(data, 'timestamp'),
    [data]
  );
  const { axis, tickFill, grid } = useChartAxisColors();
  const xAxisProps = mergeAxisTheme(
    getAdaptiveTimeXAxisProps(chartData, 'timestamp'),
    axis,
    tickFill
  );
  const yAxisProps = mergeAxisTheme(getDefaultYAxisProps(1), axis, tickFill);

  const [showVpd, setShowVpd] = useState(true);

  const handleLegendClick = (entry: ChartLegendPayloadEntry) => {
    if (entry?.dataKey !== 'vpd') return;
    setShowVpd((prev) => !prev);
  };

  const handleScreenshot = async () => {
    if (chartRef.current) {
      const canvas = await html2canvas(chartRef.current);
      const link = document.createElement('a');
      link.download = 'vpd_chart.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const handleDownloadData = () => {
    const csv =
      `timestamp,vpd_${vpdUnit.replace(/\s+/g, '_')}\n` +
      data.map((d) => `${d.timestamp},${formatNumber(d.vpd)}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vpd_data.csv';
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
          title={t('analytics.vpd.title')}
          subtitle={
            vpdUnit
              ? t('analytics.vpd.subtitleWithUnit', { unit: vpdUnit })
              : t('analytics.vpd.subtitle')
          }
          startAdornment={
            <Icon as={FaLeaf} color="green.500" boxSize={5} aria-hidden />
          }
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
        empty={chartData.length === 0}
        chartRef={chartRef}
        height={CHART_PLOT_HEIGHT_VPD_PX}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 16,
              right: 0,
              left: getChartMarginLeft(),
              bottom: 0,
            }}
          >
            <CartesianGrid {...themedCartesianGrid(grid)} />
            <XAxis {...xAxisProps} />
            <YAxis
              {...yAxisProps}
              domain={[0, 'auto']}
              label={yAxisLabelInsideLeft(
                t('analytics.vpd.axisLabel', { unit: vpdUnit }).trim(),
                tickFill
              )}
            />
            <Tooltip
              cursor={defaultTooltipCursor}
              content={
                <UnifiedTooltip
                  valueFormatter={(v) => {
                    if (v == null) return '—';
                    const num = typeof v === 'number' ? v : Number(v);
                    return Number.isNaN(num)
                      ? String(v)
                      : `${formatNumber(num, 1)} ${vpdUnit}`.trim();
                  }}
                />
              }
            />
            <Legend
              wrapperStyle={defaultLegendWrapperStyle}
              content={
                <ChartLegend
                  onClick={handleLegendClick}
                  hiddenDataKeys={showVpd ? [] : ['vpd']}
                />
              }
            />
            <Line
              dataKey="vpd"
              name={
                vpdUnit
                  ? t('analytics.vpd.legendNameWithUnit', { unit: vpdUnit })
                  : legendName
              }
              stroke="#3182ce"
              {...defaultLineProps}
              hide={!showVpd}
              activeDot={activeDotForSeries('#3182ce')}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartStateView>
    </Box>
  );
};

export default VPDChart;
