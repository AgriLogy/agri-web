import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import ElectrovanCard from './ElectrovanCard';

/**
 * One solenoid valve in the dashboard "Électrovannes" tile: name, LoRaWAN
 * DevEUI, mode (manual / auto) and activated state. Props only; the parent
 * tile supplies the data.
 */
const meta = {
  title: 'Tableau de bord/ElectrovanCard',
  component: ElectrovanCard,
  args: {
    electrovanne: {
      id: 1,
      vanneName: 'Vanne Zone A1 — Tomates',
      statusMode: 'auto',
      devEUI: 'A84041FFFE0B1C2D',
      isActivated: true,
    },
    onClick: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 300 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ElectrovanCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Automatic mode, valve open. */
export const AutoActivated: Story = {};

/** Manual mode, valve closed. */
export const ManualDeactivated: Story = {
  args: {
    electrovanne: {
      id: 2,
      vanneName: 'Vanne Zone A2 — Agrumes',
      statusMode: 'manual',
      devEUI: 'A84041FFFE0B1C3E',
      isActivated: false,
    },
  },
};

/** Long valve name. */
export const LongName: Story = {
  args: {
    electrovanne: {
      id: 3,
      vanneName: 'Vanne secteur Sud — goutte-à-goutte oliviers jeunes plants',
      statusMode: 'auto',
      devEUI: 'A84041FFFE0B1C4F',
      isActivated: false,
    },
  },
};
