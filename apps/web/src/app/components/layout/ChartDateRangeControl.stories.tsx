import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import dayjs from 'dayjs';
import {
  ChartDateRangeControl,
  defaultChartDateRange,
} from './ChartDateRangeControl';

const daysAgo = (n: number) => dayjs().subtract(n, 'day').format('YYYY-MM-DD');

/**
 * Date-range picker shared by every analytics page (antd RangePicker) with
 * presets 24 h / 7 j / 30 j / 90 j / 12 mois. Future dates are disabled by
 * default. On phones it collapses to a calendar icon. No data source.
 */
const meta = {
  title: 'Mise en page/ChartDateRangeControl',
  component: ChartDateRangeControl,
  args: { value: defaultChartDateRange(), onChange: fn() },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return (
      <ChartDateRangeControl
        {...args}
        value={value}
        onChange={(next) => {
          setValue(next);
          args.onChange(next);
        }}
      />
    );
  },
} satisfies Meta<typeof ChartDateRangeControl>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default window: the last 24 hours. */
export const Last24Hours: Story = {};

/** A 30-day window. */
export const Last30Days: Story = {
  args: { value: { startDate: daysAgo(29), endDate: daysAgo(0) } },
};

/** Calendar open, with the preset list. */
export const Open: Story = {
  decorators: [
    (Story) => (
      <div style={{ minHeight: 420 }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const [start] = within(canvasElement).getAllByRole('textbox');
    await userEvent.click(start);
    await expect(
      await within(document.body).findByText(/30/, {
        selector: '.ant-picker-presets li',
      })
    ).toBeInTheDocument();
  },
};
