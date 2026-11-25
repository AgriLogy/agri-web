import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Box } from '@chakra-ui/react';
import WaterSoilLastData from './WaterSoilLastData';
import {
  soilHighSeries,
  soilLowSeries,
  soilMediumSeries,
  waterFlowSeries,
} from '@/stories/mocks/sensors';

const last = <T,>(rows: T[]) => rows[rows.length - 1];

/**
 * "Last data" card next to the soil moisture chart: the latest value of
 * each probe depth and of the water flow, with how long ago it was read,
 * plus an "add alert" button for editors. Gets the last row of each
 * `/sensors/*` series as props from WaterSoilMain.
 */
const meta = {
  title: 'Capteurs/Humidité du sol/WaterSoilLastData',
  component: WaterSoilLastData,
  decorators: [
    (Story) => (
      <Box maxW="320px">
        <Story />
      </Box>
    ),
  ],
  args: {
    soilLow: last(soilLowSeries()),
    soilMedium: last(soilMediumSeries()),
    soilHigh: last(soilHighSeries()),
    waterFlow: last(waterFlowSeries()),
  },
} satisfies Meta<typeof WaterSoilLastData>;

export default meta;
type Story = StoryObj<typeof meta>;

/** All three probes and the flow meter. */
export const Default: Story = {};

/** A zone with a single probe and no flow meter. */
export const SingleProbe: Story = {
  args: { soilLow: undefined, soilHigh: undefined, waterFlow: undefined },
};

/** Old readings: the probe stopped sending three days ago. */
export const StaleReadings: Story = {
  args: {
    soilLow: {
      ...last(soilLowSeries()),
      timestamp: new Date(Date.now() - 3 * 24 * 3600_000).toISOString(),
    },
    soilMedium: undefined,
    soilHigh: undefined,
    waterFlow: undefined,
  },
};

/** No probe has sent anything. */
export const NoData: Story = {
  args: {
    soilLow: undefined,
    soilMedium: undefined,
    soilHigh: undefined,
    waterFlow: undefined,
  },
};
