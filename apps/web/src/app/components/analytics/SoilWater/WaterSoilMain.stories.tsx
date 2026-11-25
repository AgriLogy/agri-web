import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse, delay } from 'msw';
import WaterSoilMain from './WaterSoilMain';
import { api } from '@/stories/mocks/api';
import {
  soilHighSeries,
  soilLowSeries,
  soilMediumSeries,
  waterFlowSeries,
} from '@/stories/mocks/sensors';

const DAY = 24 * 3600_000;

/**
 * The full soil moisture block of the soil page: chart, date-range slider
 * and "last data" card. Fetches `GET /sensors/soilmoisturelow`,
 * `/soilmoisturemedium`, `/soilmoisturehigh` and `/waterflow` for the range
 * and zone in `filters`.
 */
const meta = {
  title: 'Capteurs/Humidité du sol/WaterSoilMain',
  component: WaterSoilMain,
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
        soil: [
          http.get(api('/sensors/soilmoisturelow'), () =>
            HttpResponse.json(soilLowSeries())
          ),
          http.get(api('/sensors/soilmoisturemedium'), () =>
            HttpResponse.json(soilMediumSeries())
          ),
          http.get(api('/sensors/soilmoisturehigh'), () =>
            HttpResponse.json(soilHighSeries())
          ),
          http.get(api('/sensors/waterflow'), () =>
            HttpResponse.json(waterFlowSeries())
          ),
        ],
      },
    },
  },
} satisfies Meta<typeof WaterSoilMain>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Seven days from all four endpoints. */
export const Default: Story = {};

/** While the requests are pending. */
export const Loading: Story = {
  parameters: {
    msw: {
      handlers: {
        soil: [
          http.get(api('/sensors/*'), async () => {
            await delay('infinite');
            return HttpResponse.json([]);
          }),
        ],
      },
    },
  },
};
