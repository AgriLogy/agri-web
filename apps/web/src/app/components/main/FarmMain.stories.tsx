import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { http, HttpResponse, delay } from 'msw';
import FarmMain from './FarmMain';
import { api } from '@/stories/mocks/api';
import type { FarmSectorNode } from '@agri/api-client';

const ago = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

const captors = (n: number, hoursAgo: number | null) =>
  Array.from({ length: n }, (_, i) => ({
    sensor_key: ['soil_moisture_10', 'soil_temperature', 'ec_soil', 'ph_soil'][
      i % 4
    ],
    configured: true,
    last_received: hoursAgo == null ? null : ago(hoursAgo + i),
  }));

const FARM: FarmSectorNode[] = [
  {
    sector_id: 1,
    sector_name: 'Parcelle Nord',
    zones: [
      { zone_id: 1, zone_name: 'Zone A1 — Tomates', captors: captors(8, 1) },
      { zone_id: 2, zone_name: 'Zone A2 — Agrumes', captors: captors(4, 30) },
    ],
  },
  {
    sector_id: 2,
    sector_name: 'Parcelle Sud',
    zones: [
      { zone_id: 3, zone_name: 'Zone B1 — Olivier', captors: captors(3, null) },
    ],
  },
  {
    sector_id: null,
    sector_name: null,
    zones: [{ zone_id: 4, zone_name: 'Serre 1', captors: [] }],
  },
];

/**
 * **Ma ferme** (`/farm`): the farm as nested boxes, sector → zone → one dot
 * per sensor. Dot colour = freshness: green under 24 h, orange older, grey
 * never received. Editors can create sectors, assign zones and delete a
 * sector after confirming (agri-web #193); zones are then unassigned.
 *
 * Data: `GET /sectors/overview`.
 */
const meta = {
  title: 'Pages/Ma ferme (FarmMain)',
  component: FarmMain,
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: {
        farm: [
          http.get(api('/sectors/overview'), () => HttpResponse.json(FARM)),
          http.delete(
            api('/sectors/:id'),
            () => new HttpResponse(null, { status: 204 })
          ),
        ],
      },
    },
  },
} satisfies Meta<typeof FarmMain>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A farm with no sectors yet: everything sits in "Non assignées". */
export const NoSectors: Story = {
  parameters: {
    msw: {
      handlers: {
        farm: [
          http.get(api('/sectors/overview'), () =>
            HttpResponse.json([
              { sector_id: null, sector_name: null, zones: FARM[0].zones },
            ])
          ),
        ],
      },
    },
  },
};

/** The trash button asks first; nothing is deleted until "Supprimer". */
export const DeleteConfirmation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [trash] = await canvas.findAllByRole('button', {
      name: 'Supprimer le secteur',
    });
    await userEvent.click(trash);
    const dialog = await within(document.body).findByRole('alertdialog');
    await expect(dialog).toHaveTextContent('Parcelle Nord');
  },
};

/** While `/sectors/overview` is loading. */
export const Loading: Story = {
  parameters: {
    msw: {
      handlers: {
        farm: [
          http.get(api('/sectors/overview'), async () => {
            await delay('infinite');
            return HttpResponse.json([]);
          }),
        ],
      },
    },
  },
};
