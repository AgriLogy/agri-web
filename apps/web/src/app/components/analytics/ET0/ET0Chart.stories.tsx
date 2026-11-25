import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ET0Chart from './ET0Chart';
import {
  et0CalculatedSeries,
  et0OpenMeteoSeries,
  et0WeatherSeries,
} from '@/stories/mocks/sensors';

/**
 * ET₀ chart on the station page: hourly bars for the weather station's ET₀
 * and the model's calculated ET₀, plus Open-Meteo's daily reference as a
 * line. Clicking a legend entry hides that series; the camera and download
 * buttons export a PNG or CSV. Data arrives as props from ET0Main
 * (`/sensors/et0weather`, `/sensors/et0calculated`, `/weather/et0-series`).
 */
const meta = {
  title: 'Capteurs/ET0/ET0Chart',
  component: ET0Chart,
  args: {
    weatherData: et0WeatherSeries(),
    calculatedData: et0CalculatedSeries(),
    openMeteoData: et0OpenMeteoSeries(),
    loading: false,
  },
} satisfies Meta<typeof ET0Chart>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Seven days of all three series. */
export const Default: Story = {};

/** Only the calculated series (no ET₀ sensor on the station, the common case). */
export const CalculatedOnly: Story = {
  args: { weatherData: [], openMeteoData: [] },
};

/** While the data is loading. */
export const Loading: Story = {
  args: {
    weatherData: [],
    calculatedData: [],
    openMeteoData: [],
    loading: true,
  },
};

/** Nothing in the selected range. */
export const Empty: Story = {
  args: { weatherData: [], calculatedData: [], openMeteoData: [] },
};
