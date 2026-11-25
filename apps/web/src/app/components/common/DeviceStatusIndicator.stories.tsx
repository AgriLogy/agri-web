import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse, delay } from 'msw';
import { Box } from '@chakra-ui/react';
import DeviceStatusIndicator from './DeviceStatusIndicator';
import { api } from '@/stories/mocks/api';

const ago = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

/** `GET /sensors/:slug` rows ending with `last` (oldest first, like the API). */
const series = (last: number, unit: string) =>
  [last + 0.02, last + 0.01, last].map((value, i) => ({
    id: 9000 + i,
    value,
    timestamp: ago(3 - i),
    default_unit: unit,
    available_units: [unit],
  }));

/** Answers battery (V) and signal (dBm); `null` = no readings for that one. */
const deviceHealth = (battery: number | null, signal: number | null) => [
  http.get(api('/sensors/battery'), () =>
    HttpResponse.json(battery == null ? [] : series(battery, 'V'))
  ),
  http.get(api('/sensors/signal'), () =>
    HttpResponse.json(signal == null ? [] : series(signal, 'dBm'))
  ),
];

/**
 * Small battery % + signal-quality badge for a LoRaWAN node, in the top
 * corner of a "dernière valeur" card. Hover shows volts / dBm. Renders
 * nothing for zones without device-health data (e.g. Bivocom routers).
 *
 * Data: `GET /sensors/battery` and `GET /sensors/signal` (last 45 days, last
 * reading used).
 */
const meta = {
  title: 'Commun/DeviceStatusIndicator',
  component: DeviceStatusIndicator,
  args: { zoneId: 1 },
  decorators: [
    (Story) => (
      <Box
        position="relative"
        w="280px"
        h="120px"
        borderWidth="1px"
        borderRadius="xl"
        p={3}
      >
        <Box position="absolute" top={2} insetEnd={2}>
          <Story />
        </Box>
      </Box>
    ),
  ],
  parameters: { msw: { handlers: { device: deviceHealth(3.52, -84) } } },
} satisfies Meta<typeof DeviceStatusIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Fresh battery and strong signal (green). */
export const Healthy: Story = {};

/** Nearly flat battery and weak signal (red). */
export const LowBatteryWeakSignal: Story = {
  parameters: { msw: { handlers: { device: deviceHealth(3.05, -116) } } },
};

/** Only the signal is reported; battery chip is left out. */
export const SignalOnly: Story = {
  parameters: { msw: { handlers: { device: deviceHealth(null, -104) } } },
};

/** Zone without device-health data: the badge renders nothing (empty card). */
export const NoDeviceData: Story = {
  parameters: { msw: { handlers: { device: deviceHealth(null, null) } } },
};

/** While the requests are pending nothing is shown either. */
export const Loading: Story = {
  parameters: {
    msw: {
      handlers: {
        device: [
          http.get(api('/sensors/:slug'), async () => {
            await delay('infinite');
            return HttpResponse.json([]);
          }),
        ],
      },
    },
  },
};
