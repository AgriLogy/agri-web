import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { HStack } from '@chakra-ui/react';
import PumpSchematic from './PumpSchematic';

/**
 * Pump drawing on the "Vannes & pompes" schema page: green body when the pump
 * runs, grey when it is off. Props only. The component has no fault state.
 */
const meta = {
  title: 'Vannes & pompes/PumpSchematic',
  component: PumpSchematic,
  args: { running: true, label: '2' },
} satisfies Meta<typeof PumpSchematic>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Pump running. */
export const Running: Story = {};

/** Pump off. */
export const Stopped: Story = { args: { running: false } };

/** A row of pumps as on the schema page, mixed states. */
export const Row: Story = {
  render: () => (
    <HStack spacing={8} align="end">
      <PumpSchematic running label="2" />
      <PumpSchematic running={false} label="3" />
      <PumpSchematic running label="4" />
    </HStack>
  ),
};
