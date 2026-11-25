import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Box } from '@chakra-ui/react';
import { DataCard } from './DataCard';

/**
 * Card shown under an assistant answer for command-style replies: latest
 * readings (metrics), active alerts, or recent notifications. Built from the
 * `data` field of `POST /assistant/chat`; this component only gets the
 * normalised card as a prop.
 */
const meta = {
  title: 'Assistant/DataCard',
  component: DataCard,
  decorators: [
    (Story) => (
      <Box maxW="380px" p="10px 13px" borderWidth="1px" borderRadius="12px">
        <Story />
      </Box>
    ),
  ],
  args: {
    card: {
      type: 'metrics',
      items: [
        { label: "Température de l'air", value: 27.4, unit: '°C' },
        { label: 'Humidité de l’air', value: 41, unit: '%' },
        { label: 'Humidité du sol (30 cm)', value: 24.5, unit: '%' },
        { label: 'Vitesse du vent', value: 3.8, unit: 'm/s' },
        { label: 'pH du sol', value: null },
      ],
    },
  },
} satisfies Meta<typeof DataCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Latest readings; a missing value shows "—". */
export const Metrics: Story = {};

/** Active alerts: orange dot for a warning, green circle otherwise. */
export const Alerts: Story = {
  args: {
    card: {
      type: 'alerts',
      items: [
        {
          name: 'Sol trop sec',
          zone: 'Zone A1 — Tomates',
          condition: '<',
          threshold: 22,
          severity: 'warning',
        },
        {
          name: 'Gel matinal',
          zone: 'Zone A2 — Agrumes',
          condition: '<',
          threshold: 2,
        },
      ],
    },
  },
};

/** Recent notifications. */
export const Notifications: Story = {
  args: {
    card: {
      type: 'notifications',
      items: [
        {
          title: 'Sol trop sec — Zone A1',
          message: 'Humidité du sol à 20,8 % (seuil 22 %).',
          date: new Date(Date.now() - 2 * 3600_000).toISOString(),
        },
        { title: 'Rapport hebdomadaire prêt' },
      ],
    },
  },
};

/** No rows: a short "nothing to show" line. */
export const Empty: Story = {
  args: { card: { type: 'alerts', items: [] } },
};

/** The tool itself failed: its message in orange. */
export const ToolError: Story = {
  args: {
    card: { type: 'error', message: 'Aucun capteur trouvé pour cette zone.' },
  },
};
