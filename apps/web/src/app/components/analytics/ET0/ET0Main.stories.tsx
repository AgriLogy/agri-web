import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse, delay } from 'msw';
import ET0Main from './ET0Main';
import { api } from '@/stories/mocks/api';
import {
  et0CalculatedSeries,
  et0OpenMeteoSeries,
  et0WeatherSeries,
} from '@/stories/mocks/sensors';

const DAY = 24 * 3600_000;

/**
 * The full ET₀ block of the station page: chart, date-range slider and the
 * "last data" card. Fetches `GET /sensors/et0weather`,
 * `GET /sensors/et0calculated` and `GET /weather/et0-series` for the range
 * and zone in `filters`.
 */
const meta = {
  title: 'Capteurs/ET0/ET0Main',
  component: ET0Main,
  args: {
    filters: {
      startDate: new Date(Date.now() - 7 * DAY).toISOString(),
      endDate: new Date().toISOString(),
      selectedZone: 1,
    },
  },
  parameters: {
    msw: {
      handlers: {
        et0: [
          http.get(api('/sensors/et0weather'), () =>
            HttpResponse.json(et0WeatherSeries())
          ),
          http.get(api('/sensors/et0calculated'), () =>
            HttpResponse.json(et0CalculatedSeries())
          ),
          http.get(api('/weather/et0-series'), () =>
            HttpResponse.json(et0OpenMeteoSeries())
          ),
        ],
      },
    },
  },
} satisfies Meta<typeof ET0Main>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Seven days of data from all three endpoints. */
export const Default: Story = {};

/** While the requests are pending. */
export const Loading: Story = {
  parameters: {
    msw: {
      handlers: {
        et0: [
          http.get(api('/sensors/*'), async () => {
            await delay('infinite');
            return HttpResponse.json([]);
          }),
          http.get(api('/weather/et0-series'), () => HttpResponse.json([])),
        ],
      },
    },
  },
};
