import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse, delay } from 'msw';
import WindRadarMain from './WindRadarMain';
import { api } from '@/stories/mocks/api';
import { windDirectionSeries, windSpeedSeries } from '@/stories/mocks/sensors';

const DAY = 24 * 3600_000;

/**
 * The full wind block of the station page: wind rose and "last data" card.
 * Fetches `GET /sensors/windspeed` and `GET /sensors/winddirection` for the
 * range and zone in `filters`.
 */
const meta = {
  title: 'Capteurs/Vent/WindRadarMain',
  component: WindRadarMain,
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
        wind: [
          http.get(api('/sensors/windspeed'), () =>
            HttpResponse.json(windSpeedSeries())
          ),
          http.get(api('/sensors/winddirection'), () =>
            HttpResponse.json(windDirectionSeries())
          ),
        ],
      },
    },
  },
} satisfies Meta<typeof WindRadarMain>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Seven days from both endpoints. */
export const Default: Story = {};

/** While the requests are pending. */
export const Loading: Story = {
  parameters: {
    msw: {
      handlers: {
        wind: [
          http.get(api('/sensors/*'), async () => {
            await delay('infinite');
            return HttpResponse.json([]);
          }),
        ],
      },
    },
  },
};
