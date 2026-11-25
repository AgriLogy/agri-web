import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Box } from '@chakra-ui/react';
import ET0LastData from './ET0LastData';
import { et0CalculatedSeries, et0WeatherSeries } from '@/stories/mocks/sensors';

/**
 * "Last data" card next to the ET₀ chart: latest station and calculated ET₀,
 * today's and yesterday's daily total (the one irrigation uses), the total
 * over the range, and an "add alert" button for editors. Gets the same
 * series as the chart via props; the button's rights come from `/users/me`.
 */
const meta = {
  title: 'Capteurs/ET0/ET0LastData',
  component: ET0LastData,
  decorators: [
    (Story) => (
      <Box maxW="320px">
        <Story />
      </Box>
    ),
  ],
  args: {
    weatherData: et0WeatherSeries(),
    calculatedData: et0CalculatedSeries(),
  },
} satisfies Meta<typeof ET0LastData>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Both sources and seven days of daily totals. */
export const Default: Story = {};

/** No ET₀ sensor: the station value shows "—". */
export const CalculatedOnly: Story = {
  args: { weatherData: [] },
};

/** No reading in the range. */
export const NoData: Story = {
  args: { weatherData: [], calculatedData: [] },
};
