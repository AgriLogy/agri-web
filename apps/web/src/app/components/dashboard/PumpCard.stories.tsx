import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import PumpCard from './PumpCard';

/**
 * One pump in the dashboard "Pompes" tile: name and a running / stopped tag.
 * Data comes from the local vannes & pompes store (localStorage), not the API.
 */
const meta = {
  title: 'Tableau de bord/PumpCard',
  component: PumpCard,
  args: {
    pump: { id: 'p1', name: 'Pompe forage 1', running: true },
    onClick: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 260 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PumpCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The pump is running (green tag). */
export const Running: Story = {};

/** The pump is stopped (red tag). */
export const Stopped: Story = {
  args: { pump: { id: 'p2', name: 'Pompe doseuse engrais', running: false } },
};

/** A long name wraps inside the card. */
export const LongName: Story = {
  args: {
    pump: {
      id: 'p3',
      name: 'Pompe de reprise bassin principal — station de filtration Nord',
      running: false,
    },
  },
};
