import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { http, HttpResponse, delay } from 'msw';
import WeatherDashboard from './WeatherDashboard';
import {
  openMeteoRateLimited,
  sparseOpenMeteoBody,
  weatherHandlers,
} from '@/stories/mocks/dashboardWeather';

/**
 * Météo card on the dashboard (`/dashboard`): current temperature, wind,
 * humidity, sunrise/sunset and 7 days, with a °C/°F switch and a location
 * picker. Clicking it opens the weather details window.
 *
 * Data: Open-Meteo `GET https://api.open-meteo.com/v1/forecast` straight
 * from the browser, plus a best-effort city name from
 * `api.bigdatacloud.net`. Both are answered by MSW here.
 */
const meta = {
  title: 'Tableau de bord/WeatherDashboard',
  component: WeatherDashboard,
  parameters: {
    msw: { handlers: weatherHandlers },
  },
  beforeEach: () => {
    // Start from the default station, not a location saved by another story.
    try {
      window.localStorage.removeItem('agrilogy_weather_location');
    } catch {
      /* storage blocked */
    }
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 640 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WeatherDashboard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Forecast loaded. */
export const Default: Story = {};

/** While the forecast is loading. */
export const Loading: Story = {
  parameters: {
    msw: {
      handlers: {
        openMeteo: [
          http.get('https://api.open-meteo.com/*', async () => {
            await delay('infinite');
            return HttpResponse.json({});
          }),
        ],
      },
    },
  },
};

/** Open-Meteo rate-limited (429): a small "unavailable" placeholder. */
export const Unavailable: Story = {
  parameters: {
    msw: {
      handlers: {
        openMeteo: [
          http.get('https://api.open-meteo.com/*', () =>
            HttpResponse.json(openMeteoRateLimited, { status: 429 })
          ),
        ],
      },
    },
  },
};

/** Partial answer: missing values show "—". */
export const MissingValues: Story = {
  parameters: {
    msw: {
      handlers: {
        openMeteo: [
          http.get('https://api.open-meteo.com/*', () =>
            HttpResponse.json(sparseOpenMeteoBody())
          ),
        ],
      },
    },
  },
};

/** Clicking the current temperature opens the details window. */
export const OpenDetails: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [current] = await canvas.findAllByRole('button', {
      name: 'Détails',
    });
    await userEvent.click(current);
    await expect(
      await within(document.body).findByRole('dialog')
    ).toBeInTheDocument();
  },
};
