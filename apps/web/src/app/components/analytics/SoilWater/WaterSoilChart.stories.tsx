import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import WaterSoilChart from './WaterSoilChart';
import type { WaterSoilData } from '@/app/types';
import {
  soilHighSeries,
  soilLowSeries,
  soilMediumSeries,
  waterFlowSeries,
} from '@/stories/mocks/sensors';

/** The merged rows WaterSoilMain builds from the four endpoints. */
const merged = (withFlow = true): WaterSoilData[] => {
  const low = soilLowSeries();
  const med = soilMediumSeries();
  const high = soilHighSeries();
  const flow = waterFlowSeries();
  return low.map((row, i) => ({
    timestamp: row.timestamp,
    soilLow: row.value,
    soilMedium: med[i].value,
    soilHigh: high[i].value,
    ...(withFlow ? { waterFlow: flow[i].value } : {}),
  }));
};

/**
 * Soil moisture chart: the three probe depths (%, left axis) and the
 * irrigation water flow (m³/h, right axis), so you can see the soil respond
 * after each watering. Rows come as props from WaterSoilMain, merged from
 * `/sensors/soilmoisturelow|medium|high` and `/sensors/waterflow`.
 */
const meta = {
  title: 'Capteurs/Humidité du sol/WaterSoilChart',
  component: WaterSoilChart,
  args: { data: merged(), waterFlowDefaultUnit: 'm³/h', loading: false },
} satisfies Meta<typeof WaterSoilChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Seven days: daily morning irrigation, soil drying through the day. */
export const Default: Story = {};

/** Probes only, no flow meter on this zone. */
export const NoFlowMeter: Story = {
  args: { data: merged(false), waterFlowDefaultUnit: undefined },
};

/** While the data is loading. */
export const Loading: Story = {
  args: { data: [], loading: true },
};

/** Nothing in the selected range. */
export const Empty: Story = {
  args: { data: [] },
};
