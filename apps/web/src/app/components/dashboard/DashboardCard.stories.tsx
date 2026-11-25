import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button, Text } from '@chakra-ui/react';
import DashboardCard from './DashboardCard';
import EmptyBox from '../common/EmptyBox';

/**
 * Plain frame used by the dashboard tiles (`/dashboard`): a bold title, an
 * optional control on the right of the title, then any content. No data of
 * its own.
 */
const meta = {
  title: 'Tableau de bord/DashboardCard',
  component: DashboardCard,
  args: {
    title: 'Humidité du sol',
    content: (
      <Text fontSize="sm">
        Zone A1 — Tomates : 31 % à 10 cm, stable sur 24 h.
      </Text>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DashboardCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Title and a short line of content. */
export const Default: Story = {};

/** A link/button on the right of the title, as on the notifications tile. */
export const WithTitleAddon: Story = {
  args: {
    titleAddon: (
      <Button size="xs" variant="ghost" colorScheme="brand">
        Voir tout
      </Button>
    ),
  },
};

/** Nothing to show yet: the content is an empty placeholder. */
export const EmptyContent: Story = {
  args: { content: <EmptyBox variant="empty" /> },
};

/** A long title wraps instead of pushing the addon out of the card. */
export const LongTitle: Story = {
  args: {
    title:
      'Conductivité électrique moyenne de la solution du sol — Zone B3 — Agrumes sous serre',
    titleAddon: (
      <Button size="xs" variant="ghost" colorScheme="brand">
        Voir tout
      </Button>
    ),
  },
};
