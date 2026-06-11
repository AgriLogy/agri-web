import React, { useMemo, useRef, useState } from 'react';
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
import { Box, Flex, Button, HStack } from '@chakra-ui/react';
import { FaDownload, FaCamera } from 'react-icons/fa';
import { useTranslations } from 'next-intl';
import html2canvas from 'html2canvas';
import { NpkSensorData } from '@/app/types';
import ChartPanelHeading from '../../common/ChartPanelHeading';
import ChartStateView from '../../common/ChartStateView';
import UnifiedTooltip from '../../common/UnifiedTooltip';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import { useUnitOverridesRevision } from '@/app/hooks/useUnitOverridesRevision';
import {
  compactResolvedAxisUnits,
  formatCalibratedReading,
  resolveAxisUnit,
} from '@/app/utils/unitOverrides';
import { calibratedValueInAxisUnit } from '@/app/utils/calibratedValueInAxisUnit';
import { getCatalogDefaultUnit } from '@/app/utils/sensorCatalog';
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

const NpkSizeChart = ({
  data,
  loading,
}: {
  data: NpkSensorData[];
  loading: boolean;
}) => {
  const t = useTranslations();
  const chartRef = useRef<HTMLDivElement>(null);
  const { textColor } = useColorModeStyles();
  const { axis, tickFill, grid } = useChartAxisColors();
  const unitRev = useUnitOverridesRevision();

  const catalogDefault =
    data[data.length - 1]?.default_unit ??
    data[0]?.default_unit ??
    getCatalogDefaultUnit('npk_n');

  const chartData = useMemo(
    () =>
      data.map((item) => {
        const rowDefault = item.default_unit ?? catalogDefault;
        return {
          name: item.timestamp,
          default_unit: item.default_unit,
          nitrogen_value: item.nitrogen_value,
          phosphorus_value: item.phosphorus_value,
          potassium_value: item.potassium_value,
          npk_n: calibratedValueInAxisUnit(
            'npk_n',
            item.nitrogen_value,
            catalogDefault,
            rowDefault
          ),
          npk_p: calibratedValueInAxisUnit(
            'npk_p',
            item.phosphorus_value,
            catalogDefault,
            rowDefault
          ),
          npk_k: calibratedValueInAxisUnit(
            'npk_k',
            item.potassium_value,
            catalogDefault,
            rowDefault
          ),
        };
      }),
    [data, unitRev, catalogDefault]
  );

  const chartRows = useMemo(
    () => addTimeMsToChartRows(chartData, 'name'),
    [chartData]
  );

  const xAxisProps = mergeAxisTheme(
    getAdaptiveTimeXAxisProps(chartRows, 'name'),
    axis,
    tickFill
  );
  const yProps = mergeAxisTheme(getDefaultYAxisProps(1), axis, tickFill);

  const unitN = resolveAxisUnit('npk_n', catalogDefault);
  const unitP = resolveAxisUnit('npk_p', catalogDefault);
  const unitK = resolveAxisUnit('npk_k', catalogDefault);
  const npkAxisUnits = compactResolvedAxisUnits(
    ['npk_n', 'npk_p', 'npk_k'],
    catalogDefault
  );

  const [activeLines, setActiveLines] = useState({
    npk_n: true,
    npk_p: true,
    npk_k: true,
  });

  const handleLegendClick = (e: ChartLegendPayloadEntry) => {
    const key = e.dataKey;
    if (key !== 'npk_n' && key !== 'npk_p' && key !== 'npk_k') return;
    setActiveLines((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const hiddenLegendKeys = (['npk_n', 'npk_p', 'npk_k'] as const).filter(
    (k) => !activeLines[k]
  );

  const handleScreenshot = async () => {
    if (chartRef.current) {
      const canvas = await html2canvas(chartRef.current);
      const link = document.createElement('a');
      link.download = 'npk_chart.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const handleDownloadData = () => {
    const csv =
      'timestamp,npk_n,npk_p,npk_k\n' +
      chartData
        .map((d) => `${d.name},${d.npk_n},${d.npk_p},${d.npk_k}`)
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'npk_data.csv';
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
          title={t('analytics.npkChart.title')}
          subtitle={t('analytics.npkChart.subtitle', { units: npkAxisUnits })}
        />
        <HStack spacing={2}>
          <Button
            aria-label={t('analytics.common.captureChartAria')}
            variant="ghost"
            onClick={handleScreenshot}
          >
            <FaCamera />
          </Button>
          <Button
            aria-label={t('analytics.common.exportCsvAria')}
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
          <LineChart
            data={chartRows}
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
              {...yProps}
              label={yAxisLabelInsideLeft(
                t('analytics.npkChart.yAxisLabel', { units: npkAxisUnits }),
                tickFill
              )}
            />
            <Tooltip
              content={
                <UnifiedTooltip
                  valueFormatter={(value, _name, item) => {
                    const p = item.payload as
                      | {
                          nitrogen_value?: number;
                          phosphorus_value?: number;
                          potassium_value?: number;
                          default_unit?: string;
                        }
                      | undefined;
                    const fallback =
                      typeof p?.default_unit === 'string'
                        ? p.default_unit
                        : catalogDefault;
                    const dk = item.dataKey;
                    if (
                      dk === 'npk_n' &&
                      typeof p?.nitrogen_value === 'number' &&
                      Number.isFinite(p.nitrogen_value)
                    ) {
                      return `${formatCalibratedReading('npk_n', p.nitrogen_value)} ${resolveAxisUnit('npk_n', fallback)}`.trim();
                    }
                    if (
                      dk === 'npk_p' &&
                      typeof p?.phosphorus_value === 'number' &&
                      Number.isFinite(p.phosphorus_value)
                    ) {
                      return `${formatCalibratedReading('npk_p', p.phosphorus_value)} ${resolveAxisUnit('npk_p', fallback)}`.trim();
                    }
                    if (
                      dk === 'npk_k' &&
                      typeof p?.potassium_value === 'number' &&
                      Number.isFinite(p.potassium_value)
                    ) {
                      return `${formatCalibratedReading('npk_k', p.potassium_value)} ${resolveAxisUnit('npk_k', fallback)}`.trim();
                    }
                    const n = typeof value === 'number' ? value : Number(value);
                    return Number.isFinite(n)
                      ? n.toFixed(2)
                      : String(value ?? '—');
                  }}
                />
              }
            />
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
              type="monotone"
              dataKey="npk_n"
              name={`${data[0]?.nitrogen_courbe_name || t('sensors.npk_n')} (${unitN})`}
              hide={!activeLines.npk_n}
              stroke={data[0]?.nitrogen_color || '#dba800'}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={activeDotForSeries(
                data[0]?.nitrogen_color || '#dba800'
              )}
            />
            <Line
              type="monotone"
              dataKey="npk_p"
              name={`${data[0]?.phosphorus_courbe_name || t('sensors.npk_p')} (${unitP})`}
              hide={!activeLines.npk_p}
              stroke={data[0]?.phosphorus_color || '#00a86b'}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={activeDotForSeries(
                data[0]?.phosphorus_color || '#00a86b'
              )}
            />
            <Line
              type="monotone"
              dataKey="npk_k"
              name={`${data[0]?.potassium_courbe_name || t('sensors.npk_k')} (${unitK})`}
              hide={!activeLines.npk_k}
              stroke={data[0]?.potassium_color || '#4682b4'}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={activeDotForSeries(
                data[0]?.potassium_color || '#4682b4'
              )}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartStateView>
    </Box>
  );
};

export default NpkSizeChart;
