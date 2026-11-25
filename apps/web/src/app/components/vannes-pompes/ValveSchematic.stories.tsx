import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { HStack } from '@chakra-ui/react';
import ValveSchematic from './ValveSchematic';

/**
 * Valve drawing on the "Vannes & pompes" schema page: green capsule when
 * open, a crossed "X" when closed, with optional pipe stubs above and below.
 * Props only. The component has no fault state.
 */
const meta = {
  title: 'Vannes & pompes/ValveSchematic',
  component: ValveSchematic,
  args: { active: true, label: '1' },
} satisfies Meta<typeof ValveSchematic>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Valve open. */
export const Open: Story = {};

/** Valve closed. */
export const Closed: Story = { args: { active: false } };

/** Compact, no top pipe: how the schema page draws its valve row. */
export const CompactRow: Story = {
  render: () => (
    <HStack spacing={6} align="start">
      {[true, false, true, false, false].map((active, i) => (
        <ValveSchematic
          key={i}
          active={active}
          label={String(i + 1)}
          compact
          showTopRun={false}
          showBottomDrop
        />
      ))}
    </HStack>
  ),
};

/** Glyph only, no pipes and no label. */
export const GlyphOnly: Story = {
  args: { showTopRun: false, showBottomDrop: false, label: undefined },
};
