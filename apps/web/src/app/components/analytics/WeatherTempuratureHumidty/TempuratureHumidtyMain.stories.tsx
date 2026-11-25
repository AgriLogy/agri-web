import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse, delay } from 'msw';
import TempuratureHumidtyMain from './TempuratureHumidtyMain';
import { api } from '@/stories/mocks/api';
import { humiditySeries, temperatureSeries } from '@/stories/mocks/sensors';

const DAY = 24 * 3600_000;

/**
 * The full temperature & humidity block of the station page: chart,
 * date-range slider and "last data" card. Fetches
 * `GET /sensors/temperatureweather` and `GET /sensors/humidityweather` for
 * the range and zone in `filters`.
 */
const meta = {
  title: 'Capteurs/Température & humidité/TempuratureHumidtyMain',
  component: TempuratureHumidtyMain,
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
        weather: [
          http.get(api('/sensors/temperatureweather'), () =>
            HttpResponse.json(temperatureSeries())
          ),
          http.get(api('/sensors/humidityweather'), () =>
            HttpResponse.json(humiditySeries())
          ),
        ],
      },
    },
  },
} satisfies Meta<typeof TempuratureHumidtyMain>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Seven days from both endpoints. */
export const Default: Story = {};

/** While the requests are pending. */
export const Loading: Story = {
  parameters: {
    msw: {
      handlers: {
        weather: [
          http.get(api('/sensors/*'), async () => {
            await delay('infinite');
            return HttpResponse.json([]);
          }),
        ],
      },
    },
  },
};
