import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import WindRadarChart from './WindRadarChart';
import { windDirectionSeries, windSpeedSeries } from '@/stories/mocks/sensors';

/**
 * Wind rose on the station page: for each of 16 compass directions, how
 * often the wind blew from there, stacked by speed band. Speed and direction
 * readings are paired by timestamp. Data as props from WindRadarMain
 * (`/sensors/windspeed`, `/sensors/winddirection`).
 */
const meta = {
  title: 'Capteurs/Vent/WindRadarChart',
  component: WindRadarChart,
  args: {
    windSpeedData: windSpeedSeries(),
    windDirectionData: windDirectionSeries(),
    loading: false,
  },
} satisfies Meta<typeof WindRadarChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Seven days: mostly north-westerly sea breeze, two days of easterly chergui. */
export const Default: Story = {};

/** A single calm day (all under 4 m/s). */
export const CalmDay: Story = {
  args: {
    windSpeedData: windSpeedSeries(1).map((r) => ({
      ...r,
      value: Math.min(r.value, 3.5),
    })),
    windDirectionData: windDirectionSeries(1),
  },
};

/** While the data is loading. */
export const Loading: Story = {
  args: { windSpeedData: [], windDirectionData: [], loading: true },
};

/** Nothing in the selected range. */
export const Empty: Story = {
  args: { windSpeedData: [], windDirectionData: [] },
};
