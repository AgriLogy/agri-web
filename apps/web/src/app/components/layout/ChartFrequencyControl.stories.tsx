import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ChartFrequencyControl } from './ChartFrequencyControl';

/**
 * "Fréquence des données" dropdown in the page info bar: averages every chart
 * on the page per minute, hour or day, or a custom window (e.g. every 15 min)
 * chosen in a small dialog. Averaging is client-side; no data source.
 */
const meta = {
  title: 'Mise en page/ChartFrequencyControl',
  component: ChartFrequencyControl,
  args: { value: { kind: 'hour' }, onChange: fn() },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return (
      <ChartFrequencyControl
        {...args}
        value={value}
        onChange={(next) => {
          setValue(next);
          args.onChange(next);
        }}
      />
    );
  },
} satisfies Meta<typeof ChartFrequencyControl>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Hourly average (page default). */
export const Hourly: Story = {};

/** A custom window already chosen: the option reads "Personnalisé · 15 minutes". */
export const CustomWindow: Story = {
  args: { value: { kind: 'custom', amount: 15, unit: 'minute' } },
};

/** Choosing "custom" opens the dialog to pick amount × unit. */
export const CustomDialog: Story = {
  play: async ({ canvasElement }) => {
    const select = within(canvasElement).getByRole('combobox');
    await userEvent.selectOptions(select, 'custom');
    await expect(
      await within(document.body).findByRole('dialog')
    ).toBeInTheDocument();
  },
};
