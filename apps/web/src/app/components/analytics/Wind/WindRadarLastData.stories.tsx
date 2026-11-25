import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Box } from '@chakra-ui/react';
import WindRadarLastData from './WindRadarLastData';
import { windDirectionSeries, windSpeedSeries } from '@/stories/mocks/sensors';

/**
 * "Last data" card next to the wind rose: latest wind speed and direction
 * with how long ago they were read, and an "add alert" button for editors.
 * Same series as the chart, as props from WindRadarMain.
 */
const meta = {
  title: 'Capteurs/Vent/WindRadarLastData',
  component: WindRadarLastData,
  decorators: [
    (Story) => (
      <Box maxW="320px">
        <Story />
      </Box>
    ),
  ],
  args: {
    windSpeedData: windSpeedSeries(),
    windDirectionData: windDirectionSeries(),
  },
} satisfies Meta<typeof WindRadarLastData>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Latest speed and direction. */
export const Default: Story = {};

/** Anemometer only, no wind vane. */
export const SpeedOnly: Story = {
  args: { windDirectionData: [] },
};

/** No reading in the range. */
export const NoData: Story = {
  args: { windSpeedData: [], windDirectionData: [] },
};
