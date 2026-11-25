import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Box } from '@chakra-ui/react';
import { Droplets } from 'lucide-react';
import ChartPanelHeading from './ChartPanelHeading';

/**
 * Title + muted subtitle above each chart on the analytics pages
 * (station, sol, eau, plante). Pure display, no data source.
 */
const meta = {
  title: 'Commun/ChartPanelHeading',
  component: ChartPanelHeading,
  args: {
    title: 'Humidité du sol',
    subtitle: 'Moyenne horaire à 10, 20 et 30 cm',
    color: 'app.text',
  },
} satisfies Meta<typeof ChartPanelHeading>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Title and subtitle. */
export const Default: Story = {};

/** Title only. */
export const TitleOnly: Story = { args: { subtitle: undefined } };

/** With an icon before the text. */
export const WithIcon: Story = {
  args: {
    startAdornment: (
      <Box color="brand.500" pt={1}>
        <Droplets size={20} aria-hidden />
      </Box>
    ),
  },
};

/** Long texts in a narrow column wrap instead of overflowing. */
export const LongText: Story = {
  args: {
    title:
      'Conductivité électrique du sol et salinité de la solution — Zone A1 — Tomates sous serre',
    subtitle:
      'Valeurs calibrées, moyenne journalière sur 90 jours ; les trous correspondent aux coupures de transmission du capteur.',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 320 }}>
        <Story />
      </div>
    ),
  ],
};
