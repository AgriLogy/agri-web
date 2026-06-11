import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  Box,
  Flex,
  HStack,
  Button,
  useBreakpointValue,
  Select,
  useColorMode,
} from '@chakra-ui/react';
import { useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import html2canvas from 'html2canvas';
import { FaDownload, FaCloudRain } from 'react-icons/fa';
import { SensorData } from '@/app/types';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import ChartPanelHeading from '../../common/ChartPanelHeading';
import ChartStateView from '../../common/ChartStateView';
import UnifiedTooltip from '../../common/UnifiedTooltip';
import { useUnitOverridesRevision } from '@/app/hooks/useUnitOverridesRevision';
import { calibrateChartValue } from '@/app/utils/chartSeriesCalibration';
import {
  formatCalibratedReading,
  resolveAxisUnit,
} from '@/app/utils/unitOverrides';
import { useChartAxisColors } from '@/app/utils/useChartAxisColors';
import ChartLegend, {
  type ChartLegendPayloadEntry,
} from '../../common/ChartLegend';
import {
  defaultBarProps,
  defaultLegendWrapperStyle,
  getDefaultYAxisProps,
  getPeriodXAxisProps,
  maxBarSizeForPointCount,
  mergeAxisTheme,
  themedCartesianGrid,
  getChartMarginLeft,
  CHART_PLOT_HEIGHT_PX,
  analyticsChartPanelLayoutProps,
  yAxisLabelInsideLeft,
} from '@/app/utils/chartAxisConfig';

/** Sum raw API values per bucket, then apply lecture calibration once (PDF: v = a×raw+b). */
function aggregateCalibratedPrecip(data: SensorData[], period: string) {
  const sumRawByKey: Record<string, number> = {};
  data.forEach((d) => {
    const date = new Date(d.timestamp);
    let key = '';
    if (period === 'day') {
      key = date.toISOString().split('T')[0];
    } else if (period === 'week') {
      const year = date.getFullYear();
      const week = Math.ceil(
        ((date.getTime() - new Date(year, 0, 1).getTime()) / 86400000 +
          new Date(year, 0, 1).getDay() +
          1) /
          7
      );
      key = `${year}-W${week}`;
    } else if (period === 'month') {
      key = `${date.getFullYear()}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, '0')}`;
    }
    const raw =
      typeof d.value === 'number' && Number.isFinite(d.value) ? d.value : 0;
    sumRawByKey[key] = (sumRawByKey[key] || 0) + raw;
  });
  return Object.entries(sumRawByKey).map(([periodKey, sumRaw]) => ({
    period: periodKey,
    sumRaw,
    precipitation_rate: calibrateChartValue('precipitation_rate', sumRaw),
  }));
}

const CumulPrecipitationChart = ({
  data,
  loading,
}: {
  data: SensorData[];
  loading: boolean;
}) => {
  const t = useTranslations();
  const chartRef = useRef<HTMLDivElement>(null);
  const [groupBy, setGroupBy] = useState('day');
  const [showBar, setShowBar] = useState(true);
  const { colorMode } = useColorMode();
  const unitRev = useUnitOverridesRevision();
  const chartData = useMemo(
    () => aggregateCalibratedPrecip(data, groupBy),
    [data, groupBy, unitRev]
  );
  const labelInterval = useBreakpointValue({
    base: Math.ceil(chartData.length / 3),
    md: Math.ceil(chartData.length / 5),
  });
  const _labelAngle = useBreakpointValue({ base: -3, md: 5 });
  const { textColor } = useColorModeStyles();
  const { axis, tickFill, grid } = useChartAxisColors();
  const xAxisProps = mergeAxisTheme(getPeriodXAxisProps(), axis, tickFill);
  const yProps = mergeAxisTheme(getDefaultYAxisProps(1), axis, tickFill);
  const precipUnit = resolveAxisUnit(
    'precipitation_rate',
    data[0]?.default_unit
  );

  const handleLegendClick = (e: ChartLegendPayloadEntry) => {
    if (e.dataKey === 'precipitation_rate') {
      setShowBar((s) => !s);
    }
  };

  const handleScreenshot = async () => {
    if (chartRef.current) {
      const canvas = await html2canvas(chartRef.current);
      const link = document.createElement('a');
      link.download = 'precipitation_chart.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const handleDownloadData = () => {
    const csv =
      'period,precipitation_calibrated_sum\n' +
      chartData
        .map((d) => `${d.period},${Number(d.precipitation_rate).toFixed(2)}`)
        .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'precipitation_data.csv';
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
          title={t('analytics.cumulPrecipitation.title')}
          subtitle={t('analytics.cumulPrecipitation.subtitle')}
        />
        <HStack spacing={2}>
          <Select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            bg={colorMode === 'dark' ? 'gray.700' : 'white'}
            color={textColor}
          >
            <option value="day">
              {t('analytics.cumulPrecipitation.perDay')}
            </option>
            <option value="week">
              {t('analytics.cumulPrecipitation.perWeek')}
            </option>
            <option value="month">
              {t('analytics.cumulPrecipitation.perMonth')}
            </option>
          </Select>
          <Button
            onClick={handleScreenshot}
            aria-label={t('analytics.common.captureChart')}
          >
            <FaCloudRain />
          </Button>
          <Button
            onClick={handleDownloadData}
            aria-label={t('analytics.common.downloadCsv')}
          >
            <FaDownload />
          </Button>
        </HStack>
      </Flex>

      <ChartStateView
        loading={loading}
        empty={chartData.length === 0}
        chartRef={chartRef}
        height={CHART_PLOT_HEIGHT_PX}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: getChartMarginLeft(),
              bottom: 5,
            }}
            barCategoryGap="14%"
          >
            <CartesianGrid {...themedCartesianGrid(grid)} />
            <XAxis dataKey="period" {...xAxisProps} interval={labelInterval} />
            <YAxis
              {...yProps}
              label={yAxisLabelInsideLeft(`Σ (${precipUnit})`, tickFill)}
            />
            <Tooltip
              content={
                <UnifiedTooltip
                  valueFormatter={(_v, _n, item) => {
                    const p = item.payload as {
                      sumRaw?: number;
                      precipitation_rate?: number;
                    };
                    const sr = p?.sumRaw;
                    if (typeof sr === 'number' && Number.isFinite(sr)) {
                      return `${formatCalibratedReading('precipitation_rate', sr)} ${precipUnit}`.trim();
                    }
                    const pr = p?.precipitation_rate;
                    return typeof pr === 'number' && Number.isFinite(pr)
                      ? `${pr.toFixed(2)} ${precipUnit}`.trim()
                      : '—';
                  }}
                />
              }
            />
            <Legend
              wrapperStyle={defaultLegendWrapperStyle}
              content={
                <ChartLegend
                  onClick={handleLegendClick}
                  hiddenDataKeys={showBar ? [] : ['precipitation_rate']}
                />
              }
            />
            <Bar
              dataKey="precipitation_rate"
              name={t('analytics.cumulPrecipitation.legendSum', {
                unit: precipUnit,
              })}
              {...defaultBarProps}
              maxBarSize={maxBarSizeForPointCount(chartData.length)}
              hide={!showBar}
              fill={colorMode === 'dark' ? '#60a5fa' : '#3b82f6'}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartStateView>
    </Box>
  );
};

export default CumulPrecipitationChart;
