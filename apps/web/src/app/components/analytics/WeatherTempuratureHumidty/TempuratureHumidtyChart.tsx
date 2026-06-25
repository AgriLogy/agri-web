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
import { Box, Flex, Button, HStack } from '@chakra-ui/react';
import { FaDownload, FaCamera } from 'react-icons/fa';
import html2canvas from 'html2canvas';
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

// Point de rosée (Magnus/Tetens) — "Les modifications" #15. RH clamped 1–100%.
const DEW_A = 17.625;
const DEW_B = 243.04;
function dewPointC(tempC: number | null, rhPct: number | null): number | null {
  if (
    tempC == null ||
    rhPct == null ||
    !Number.isFinite(tempC) ||
    !Number.isFinite(rhPct)
  )
    return null;
  const rh = Math.max(1, Math.min(100, rhPct));
  const gamma = Math.log(rh / 100) + (DEW_A * tempC) / (DEW_B + tempC);
  return Math.round(((DEW_B * gamma) / (DEW_A - gamma)) * 100) / 100;
}

interface WeatherData {
  id: number;
  timestamp: string;
  default_unit: string;
  available_units: string[];
  value: number;
  zone: number;
  user: number;
}

const TempuratureHumidtyChart = ({
  humidityData,
  temperatureData,
  loading,
}: {
  humidityData: WeatherData[];
  temperatureData: WeatherData[];
  loading: boolean;
}) => {
  const t = useTranslations();
  const chartRef = useRef<HTMLDivElement>(null);
  const { textColor } = useColorModeStyles();
  const { axis, tickFill, grid } = useChartAxisColors();
  const unitRev = useUnitOverridesRevision();

  const mergedData = useMemo(
    () =>
      humidityData.map((h) => {
        const tempEntry = temperatureData.find(
          (t) => t.timestamp === h.timestamp
        );
        const humidity = calibrateChartValue('humidity_weather', h.value);
        const temperature =
          tempEntry != null && tempEntry.value != null
            ? calibrateChartValue('temperature_weather', tempEntry.value)
            : null;
        return {
          timestamp: h.timestamp,
          humidity,
          temperature,
          dew_point: dewPointC(temperature, humidity),
        };
      }),
    [humidityData, temperatureData, unitRev]
  );

  const chartData = useMemo(
    () => addTimeMsToChartRows(mergedData, 'timestamp'),
    [mergedData]
  );
  const xAxisProps = mergeAxisTheme(
    getAdaptiveTimeXAxisProps(chartData, 'timestamp'),
    axis,
    tickFill
  );
  const yTemp = mergeAxisTheme(getDefaultYAxisProps(1), axis, tickFill);
  const yHum = mergeAxisTheme(getDefaultYAxisProps(0), axis, tickFill);

  const tempUnit = resolveAxisUnit(
    'temperature_weather',
    temperatureData[0]?.default_unit
  );
  const humUnit = resolveAxisUnit(
    'humidity_weather',
    humidityData[0]?.default_unit
  );

  const [seriesVisible, setSeriesVisible] = useState({
    temperature: true,
    humidity: true,
    dew_point: true,
  });

  const handleLegendClick = (e: ChartLegendPayloadEntry) => {
    const k = e.dataKey;
    if (k !== 'temperature' && k !== 'humidity' && k !== 'dew_point') return;
    setSeriesVisible((p) => ({ ...p, [k]: !p[k as keyof typeof p] }));
  };

  const hiddenLegendKeys = Object.entries(seriesVisible)
    .filter(([, on]) => !on)
    .map(([key]) => key) as string[];

  // Screenshot capture function
  const handleScreenshot = async () => {
    if (chartRef.current) {
      const canvas = await html2canvas(chartRef.current);
      const link = document.createElement('a');
      link.download = 'weather_chart.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  // CSV data export function
  const handleDownloadData = () => {
    const csv =
      'timestamp,humidity,temperature,dew_point\n' +
      mergedData
        .map(
          (d) =>
            `${d.timestamp},${d.humidity},${d.temperature ?? ''},${d.dew_point ?? ''}`
        )
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'weather_data.csv';
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
          title={t('analytics.weatherTempHumidity.title')}
          subtitle={t('analytics.weatherTempHumidity.subtitle', {
            tempUnit,
            humUnit,
          })}
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
        empty={mergedData.length === 0}
        emptyText={t('analytics.common.noDataAvailable')}
        chartRef={chartRef}
        height={CHART_PLOT_HEIGHT_PX}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
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
              {...yTemp}
              label={yAxisLabelInsideLeft(
                t('analytics.weatherTempHumidity.tempAxis', { unit: tempUnit }),
                tickFill
              )}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              {...yHum}
              label={yAxisLabelInsideRight(
                t('analytics.weatherTempHumidity.humidityAxis', {
                  unit: humUnit,
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
                  hiddenDataKeys={hiddenLegendKeys}
                />
              }
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="temperature"
              name={t('analytics.weatherTempHumidity.temperatureSeries', {
                unit: tempUnit,
              })}
              stroke={colorForSensor('temperature')}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={activeDotForSeries(colorForSensor('temperature'))}
              hide={!seriesVisible.temperature}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="humidity"
              name={t('analytics.weatherTempHumidity.humiditySeries', {
                unit: humUnit,
              })}
              stroke={colorForSensor('humidity')}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={activeDotForSeries(colorForSensor('humidity'))}
              hide={!seriesVisible.humidity}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="dew_point"
              name={t('analytics.weatherTempHumidity.dewPointSeries', {
                unit: tempUnit,
              })}
              stroke={colorForSensor('dew_point')}
              strokeWidth={2}
              strokeDasharray="5 4"
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              connectNulls
              activeDot={activeDotForSeries(colorForSensor('dew_point'))}
              hide={!seriesVisible.dew_point}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartStateView>
    </Box>
  );
};

export default TempuratureHumidtyChart;
