import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { http, HttpResponse } from 'msw';
import { Text } from '@chakra-ui/react';
import LastDataAddAlertButton from './LastDataAddAlertButton';
import LastDataPanel from './LastDataPanel';
import { ActiveZoneProvider } from './ActiveZoneContext';
import { api, demoZones } from '@/stories/mocks/api';

/** Requests the alert drawer makes when it opens. */
const drawerHandlers = [
  http.get(api('/sensors'), () =>
    HttpResponse.json({
      keys: [
        {
          key: 'temperature_weather',
          label: "Température de l'air",
          unit: '°C',
        },
        { key: 'soil_moisture_10', label: 'Humidité du sol 10 cm', unit: '%' },
      ],
    })
  ),
  http.get(api('/zones'), () => HttpResponse.json(demoZones)),
  http.get(api('/notification-zones'), () => HttpResponse.json([])),
  http.get(api('/alerts/suggest'), () =>
    HttpResponse.json({
      sensor_key: 'temperature_weather',
      label: "Température de l'air",
      unit: '°C',
      type: 'temperature',
      name: 'Chaleur excessive — Zone A1',
      description: 'Alerte si la température dépasse 36 °C (moyenne + 2σ).',
      condition: '>',
      condition_nbr: 36,
      mean: 29.4,
      sample_size: 312,
      is_active: true,
      window: 'recent',
    })
  ),
];

/**
 * Red "Ajouter une alerte" button at the bottom of each "dernière valeur"
 * card. Opens the alert-creation drawer in place, prefilled from
 * `GET /alerts/suggest`. Hidden for technicians and read-only (monitor)
 * accounts; the role comes from `GET /users/me`.
 */
const meta = {
  title: 'Commun/LastDataAddAlertButton',
  component: LastDataAddAlertButton,
  args: { sensorKey: 'temperature_weather' },
  decorators: [
    (Story) => (
      <ActiveZoneProvider zoneId={1}>
        <div style={{ maxWidth: 340 }}>
          <LastDataPanel variant="tempHumidity">
            <Text fontWeight="semibold">Température de l&apos;air</Text>
            <Text fontSize="2xl" fontWeight="bold">
              31,8 °C
            </Text>
            <Story />
          </LastDataPanel>
        </div>
      </ActiveZoneProvider>
    ),
  ],
  parameters: { msw: { handlers: { drawer: drawerHandlers } } },
} satisfies Meta<typeof LastDataAddAlertButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Editor account: the button shows. */
export const Editor: Story = {};

/** Custom label. */
export const CustomLabel: Story = {
  args: { label: 'Alerte humidité' },
};

/** Click opens the creation drawer, prefilled with the suggested threshold. */
export const DrawerOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [button] = await canvas.findAllByRole('button');
    await userEvent.click(button);
    await expect(
      await within(document.body).findByRole('dialog')
    ).toBeInTheDocument();
  },
};

/** Technician login: the button is hidden (card without footer). */
export const Technician: Story = {
  beforeEach: () => {
    window.localStorage.setItem('isTechnician', '1');
    return () => window.localStorage.removeItem('isTechnician');
  },
};
