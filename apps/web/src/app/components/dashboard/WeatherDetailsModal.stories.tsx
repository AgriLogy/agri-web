import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import WeatherDetailsModal from './WeatherDetailsModal';
import { parseOpenMeteoResponse } from '@/app/utils/openMeteoResponse';
import {
  fakeWeatherData,
  sparseOpenMeteoBody,
} from '@/stories/mocks/dashboardWeather';

const sparse = parseOpenMeteoResponse(true, sparseOpenMeteoBody());

const hotUv = (() => {
  const d = fakeWeatherData();
  return {
    ...d,
    hourly: { ...d.hourly, uv_index: d.hourly.uv_index.map(() => 11.4) },
    daily: { ...d.daily, uv_index_max: d.daily.uv_index_max.map(() => 11.8) },
  };
})();

/**
 * Weather detail window opened from the dashboard Météo card: current farm
 * metrics (UV, gusts, dew point, ET₀, soil), a 24 h strip and a 7-day table.
 * It gets the Open-Meteo forecast the card already fetched (no request of its
 * own). Shown open here.
 */
const meta = {
  title: 'Tableau de bord/WeatherDetailsModal',
  component: WeatherDetailsModal,
  args: {
    isOpen: true,
    onClose: fn(),
    data: fakeWeatherData(),
    cityName: 'Commune démo',
    useImperial: false,
  },
  parameters: {
    // A modal covers the page; give each story its own frame in the docs.
    docs: { story: { inline: false, iframeHeight: 640 } },
  },
} satisfies Meta<typeof WeatherDetailsModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A normal autumn week, metric units. */
export const Default: Story = {};

/** Same forecast in °F and mph (the card's unit switch). */
export const Imperial: Story = { args: { useImperial: true } };

/** Open-Meteo left most variables out and no city was found: dashes, no crash. */
export const MissingValues: Story = {
  args: { data: sparse ?? fakeWeatherData(), cityName: null },
};

/** Summer-like UV: the badges switch to the "extreme" colour. */
export const ExtremeUv: Story = { args: { data: hotUv } };
