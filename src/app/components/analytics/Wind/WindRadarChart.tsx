'use client';

import React, { useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Box, Button, HStack, Flex, useColorModeValue } from '@chakra-ui/react';
import ChartPanelHeading from '../../common/ChartPanelHeading';
import ChartStateView from '../../common/ChartStateView';
import { FaCamera, FaDownload } from 'react-icons/fa';
import html2canvas from 'html2canvas';
import {
  Chart as ChartJS,
  RadialLinearScale,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
  Chart,
} from 'chart.js';
import { PolarArea } from 'react-chartjs-2';
import { useUnitOverridesRevision } from '@/app/hooks/useUnitOverridesRevision';
import { useIsMobile } from '@/app/hooks/useIsMobile';
import {
  applySensorCalibration,
  resolveAxisUnit,
} from '@/app/utils/unitOverrides';
import {
  CHART_PLOT_HEIGHT_TALL_PX,
  analyticsChartPanelLayoutProps,
} from '@/app/utils/chartAxisConfig';

// Helper: get pixel radius from scale value (Chart.js 4 radial scale)
function getRadiusForValue(scale: any, value: number): number {
  if (typeof scale.getDistanceFromCenterForValue === 'function') {
    return scale.getDistanceFromCenterForValue(value);
  }
  const min = scale.min ?? 0;
  const max = scale.max ?? 1;
  const length = scale._length ?? 0;
  const maxRadius = length / 2;
  if (maxRadius <= 0 || max <= min) return 0;
  return ((value - min) / (max - min)) * maxRadius;
}

// Plugin to stack polar-area datasets so each radial segment shows stacked speed colors
const stackedPolarAreaPlugin = {
  id: 'stackedPolarArea',
  // Run immediately before drawing so our radii are used (after layout, no overwrite)
  beforeDatasetsDraw: (chart: Chart) => {
    const scale = chart.scales.r as any;
    const labelsLength = chart.data.labels?.length ?? 0;
    if (!scale) return;

    for (let dataIndex = 0; dataIndex < labelsLength; dataIndex++) {
      let cumulative = 0;

      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const value = dataset.data?.[dataIndex];
        if (typeof value !== 'number') return;

        const meta = chart.getDatasetMeta(datasetIndex);
        const arc = meta.data?.[dataIndex] as any;
        if (!arc) return;

        arc.innerRadius = getRadiusForValue(scale, cumulative);
        arc.outerRadius = getRadiusForValue(scale, cumulative + value);

        cumulative += value;
      });
    }
  },
};

// Register Chart.js modules + plugin
ChartJS.register(
  RadialLinearScale,
  ArcElement,
  Tooltip,
  Legend,
  stackedPolarAreaPlugin
);

interface WindData {
  timestamp: string;
  value: number;
  default_unit: string;
}

/** Bin edges in raw API space (catalog default m/s); labels follow unit overrides. */
const SPEED_BINS_RAW = [
  { min: 0, max: 2, color: '#7cb5ec' },
  { min: 2, max: 4, color: '#434348' },
  { min: 4, max: 6, color: '#90ed7d' },
  { min: 6, max: 8, color: '#f7a35c' },
  { min: 8, max: Infinity, color: '#8085e9' },
] as const;

type SpeedBin = { label: string; min: number; max: number; color: string };

function buildSpeedBinsWithLabels(axisUnit: string): SpeedBin[] {
  const unit = axisUnit;
  const fmt = (v: number) =>
    Number.isFinite(v)
      ? applySensorCalibration('wind_speed', v).toFixed(1)
      : '';
  return SPEED_BINS_RAW.map((b, i) => {
    const first = i === 0;
    const last = i === SPEED_BINS_RAW.length - 1;
    let label: string;
    if (first) {
      label = `< ${fmt(2)} ${unit}`.trim();
    } else if (last) {
      label = `> ${fmt(8)} ${unit}`.trim();
    } else {
      label = `${fmt(b.min)} – ${fmt(b.max)} ${unit}`.trim();
    }
    return { label, min: b.min, max: b.max, color: b.color };
  });
}

const LABELS_16_POINT = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
];

const getCompassSector = (degrees: number): string => {
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return LABELS_16_POINT[index];
};

const prepareWindRoseData = (
  speedData: WindData[],
  directionData: WindData[],
  speedBins: SpeedBin[],
  segmentBorderColor: string
) => {
  const countsMap: Record<string, Record<string, number>> = {};
  LABELS_16_POINT.forEach((dir) => {
    countsMap[dir] = {};
    speedBins.forEach((bin) => {
      countsMap[dir][bin.label] = 0;
    });
  });

  const limit = Math.min(speedData.length, directionData.length);
  let totalValidPoints = 0;

  for (let i = 0; i < limit; i++) {
    const speed = speedData[i];
    const direction = directionData[i];

    if (
      speed &&
      direction &&
      speed.timestamp === direction.timestamp &&
      typeof speed.value === 'number' &&
      typeof direction.value === 'number'
    ) {
      const sector = getCompassSector(direction.value);
      const speedVal = speed.value;
      const matchingBin = speedBins.find(
        (b) => speedVal >= b.min && speedVal < b.max
      );

      if (matchingBin) {
        countsMap[sector][matchingBin.label]++;
        totalValidPoints++;
      }
    }
  }

  if (totalValidPoints === 0) {
    return {
      chartData: { labels: LABELS_16_POINT, datasets: [] },
      pctMap: {},
      countsMap: {},
      maxStacked: 0,
    };
  }

  // Convert raw counts to percentages
  const pctMap: Record<string, Record<string, number>> = {};
  LABELS_16_POINT.forEach((dir) => {
    pctMap[dir] = {};
    speedBins.forEach((bin) => {
      pctMap[dir][bin.label] =
        (countsMap[dir][bin.label] / totalValidPoints) * 100;
    });
  });

  // Build datasets with actual percentages (stacking handled by plugin)
  const datasets = speedBins.map((bin) => {
    const realPercentages = LABELS_16_POINT.map(
      (dir) => pctMap[dir][bin.label]
    );
    const realCounts = LABELS_16_POINT.map((dir) => countsMap[dir][bin.label]);

    return {
      label: bin.label,
      data: realPercentages,
      realData: realPercentages,
      realCounts: realCounts,
      backgroundColor: LABELS_16_POINT.map(() => bin.color),
      borderColor: LABELS_16_POINT.map(() => segmentBorderColor),
      borderWidth: 1,
    };
  });

  const maxStacked = Math.max(
    ...LABELS_16_POINT.map((dir) =>
      speedBins.reduce((sum, bin) => sum + pctMap[dir][bin.label], 0)
    )
  );

  return {
    chartData: {
      labels: LABELS_16_POINT,
      datasets: datasets,
    },
    pctMap,
    countsMap,
    maxStacked,
  };
};

const WindRadarChart = ({
  windSpeedData,
  windDirectionData,
  loading,
}: {
  windSpeedData: WindData[];
  windDirectionData: WindData[];
  loading: boolean;
}) => {
  const t = useTranslations();
  const chartRef = useRef<HTMLDivElement>(null);
  const unitRev = useUnitOverridesRevision();
  const isMobile = useIsMobile();
  const speedBins = useMemo(() => {
    const u = resolveAxisUnit('wind_speed', windSpeedData[0]?.default_unit);
    return buildSpeedBinsWithLabels(u);
  }, [unitRev, windSpeedData]);
  const textColor = useColorModeValue('gray.800', 'gray.200');
  const gridColor = useColorModeValue(
    'rgba(0, 0, 0, 0.1)',
    'rgba(255, 255, 255, 0.1)'
  );
  const axisLineColor = useColorModeValue(
    'rgba(0, 0, 0, 0.3)',
    'rgba(255, 255, 255, 0.3)'
  );
  const backdropColor = useColorModeValue(
    'rgba(255, 255, 255, 0.85)',
    'rgba(26, 32, 44, 0.85)'
  );
  const roseSegmentBorder = useColorModeValue(
    '#ffffff',
    'rgba(15, 23, 42, 0.85)'
  );

  const { chartData, pctMap, countsMap, maxStacked } = useMemo(
    () =>
      prepareWindRoseData(
        windSpeedData,
        windDirectionData,
        speedBins,
        roseSegmentBorder
      ),
    [windSpeedData, windDirectionData, speedBins, roseSegmentBorder]
  );
  const isDataEmpty = !chartData || chartData.datasets.length === 0;

  const chartOptions: ChartOptions<'polarArea'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        min: 0,
        suggestedMax: Math.max(6, Math.ceil(maxStacked + 1)),
        angleLines: {
          display: true,
          color: axisLineColor,
          lineWidth: 0.4,
        },
        grid: {
          color: gridColor,
          circular: true,
        },
        ticks: {
          stepSize: 2,
          display: true,
          color: 'black',
          backdropColor: backdropColor,
          backdropPadding: 3,
          z: 10,
          font: { size: isMobile ? 9 : 11 },
          callback: (value: any) => {
            // If the value is 0 (the center point), return an empty string to hide it
            if (value === 0) {
              return '';
            }
            // Otherwise, write the number followed by a percentage sign
            return `${value}%`;
          },
        },
        pointLabels: {
          display: true,
          color: textColor,
          font: { size: isMobile ? 9 : 12 },
          padding: isMobile ? 2 : 4,
        },
      },
    },
    plugins: {
      legend: {
        display: true,
        // On phones the rose is the priority: drop the legend below so the
        // plot gets the full width instead of being squeezed into the left.
        position: isMobile ? 'bottom' : 'right',
        reverse: false,
        onClick: (_e, legendItem, legend) => {
          const chart = legend.chart;
          const i = legendItem.datasetIndex;
          if (typeof i !== 'number') return;
          chart.setDatasetVisibility(i, !chart.isDatasetVisible(i));
          chart.update();
        },
        labels: {
          color: textColor,
          usePointStyle: true,
          padding: isMobile ? 10 : 20,
          boxWidth: isMobile ? 10 : undefined,
          font: { size: isMobile ? 11 : 12 },
          generateLabels: (chart: Chart) =>
            chart.data.datasets.map((dataset, i) => ({
              text: String(dataset.label ?? ''),
              fillStyle: (dataset as unknown as { backgroundColor: string[] })
                .backgroundColor[0],
              strokeStyle: (dataset as unknown as { borderColor: string[] })
                .borderColor[0],
              lineWidth: (dataset as unknown as { borderWidth: number })
                .borderWidth,
              hidden: !chart.isDatasetVisible(i),
              datasetIndex: i,
            })),
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const dataset = context.dataset;
            const realValue = dataset.realData[context.dataIndex];
            const countValue = dataset.realCounts[context.dataIndex];

            if (realValue === 0) return undefined;

            return ` ${dataset.label}: ${realValue.toFixed(1)}% (${t('analytics.windRadar.measurements', { count: countValue })})`;
          },
        },
      },
    },
  };

  const handleScreenshot = async () => {
    if (chartRef.current) {
      const canvas = await html2canvas(chartRef.current, {
        scale: 2,
        backgroundColor: null,
      });
      const link = document.createElement('a');
      link.download = 'wind_direction_chart.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const handleDownloadData = () => {
    if (isDataEmpty) return;

    const headers = [
      t('analytics.windRadar.direction'),
      ...speedBins.map(
        (b) => `${b.label} (${t('analytics.windRadar.csvPercentHeader')})`
      ),
      ...speedBins.map(
        (b) => `${b.label} (${t('analytics.windRadar.csvCountHeader')})`
      ),
    ];
    const rows = LABELS_16_POINT.map((dir) => {
      const pctData = speedBins.map(
        (bin) => pctMap[dir][bin.label].toFixed(2) + '%'
      );
      const countData = speedBins.map((bin) =>
        countsMap[dir][bin.label].toString()
      );
      return [dir, ...pctData, ...countData].join(',');
    });

    const csv = headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'wind_direction_data.csv';
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
          title={t('analytics.windRadar.title')}
          subtitle={t('analytics.windRadar.subtitle')}
        />
        <HStack spacing={2}>
          <Button
            aria-label={t('analytics.common.captureAria')}
            variant="ghost"
            onClick={handleScreenshot}
          >
            <FaCamera />
          </Button>
          <Button
            aria-label={t('analytics.common.exportAria')}
            variant="ghost"
            onClick={handleDownloadData}
            isDisabled={isDataEmpty}
          >
            <FaDownload />
          </Button>
        </HStack>
      </Flex>

      <ChartStateView
        loading={loading}
        empty={isDataEmpty}
        emptyText={t('analytics.common.noDataAvailable')}
        chartRef={chartRef}
        height={isMobile ? 460 : CHART_PLOT_HEIGHT_TALL_PX}
      >
        <PolarArea data={chartData as any} options={chartOptions} />
      </ChartStateView>
    </Box>
  );
};

export default WindRadarChart;
