import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import TempuratureHumidtyChart from './TempuratureHumidtyChart';
import { humiditySeries, temperatureSeries } from '@/stories/mocks/sensors';

/**
 * Air temperature (°C) and relative humidity (%) chart on the station page,
 * with the dew point derived from both. Data as props from
 * TempuratureHumidtyMain (`/sensors/temperatureweather`,
 * `/sensors/humidityweather`).
 */
const meta = {
  title: 'Capteurs/Température & humidité/TempuratureHumidtyChart',
  component: TempuratureHumidtyChart,
  args: {
    temperatureData: temperatureSeries(),
    humidityData: humiditySeries(),
    loading: false,
  },
} satisfies Meta<typeof TempuratureHumidtyChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Seven days: warm dry afternoons, cool humid nights. */
export const Default: Story = {};

/** Temperature only (the humidity sensor is not configured). */
export const TemperatureOnly: Story = {
  args: { humidityData: [] },
};

/** While the data is loading. */
export const Loading: Story = {
  args: { temperatureData: [], humidityData: [], loading: true },
};

/** Nothing in the selected range. */
export const Empty: Story = {
  args: { temperatureData: [], humidityData: [] },
};
