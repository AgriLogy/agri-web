import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import ChartLegend, { type ChartLegendPayloadEntry } from './ChartLegend';

const SOIL: ChartLegendPayloadEntry[] = [
  { value: 'Humidité 10 cm', color: '#2f9e5b', dataKey: 'soil_moisture_10' },
  { value: 'Humidité 20 cm', color: '#d69e2e', dataKey: 'soil_moisture_20' },
  { value: 'Humidité 30 cm', color: '#805ad5', dataKey: 'soil_moisture_30' },
];

const MANY: ChartLegendPayloadEntry[] = [
  ...SOIL,
  { value: 'Température du sol', color: '#e53e3e', dataKey: 'soil_temp' },
  { value: 'Conductivité (EC)', color: '#3182ce', dataKey: 'ec_soil' },
  { value: 'pH du sol', color: '#dd6b20', dataKey: 'ph_soil' },
  { value: 'Azote (N)', color: '#38a169', dataKey: 'n' },
  { value: 'Phosphore (P)', color: '#b7791f', dataKey: 'p' },
  { value: 'Potassium (K)', color: '#6b46c1', dataKey: 'k' },
];

/**
 * Pill-shaped legend under every Recharts chart. Recharts passes `payload`
 * (one entry per series); a click can hide/show a series. No data source.
 */
const meta = {
  title: 'Commun/ChartLegend',
  component: ChartLegend,
  args: { payload: SOIL },
  argTypes: {
    iconShape: {
      control: 'inline-radio',
      options: ['line', 'square', 'circle', 'rect'],
    },
  },
} satisfies Meta<typeof ChartLegend>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Three series, line icons (default). */
export const Default: Story = {};

/** Circle icons, larger text. */
export const Circles: Story = {
  args: { iconShape: 'circle', fontSize: 15, iconSize: 12 },
};

/** Clickable: one series is hidden (muted). Click a pill to toggle it. */
export const ToggleSeries: Story = {
  args: { onClick: fn(), hiddenDataKeys: ['soil_moisture_20'] },
  render: function Render(args) {
    const [hidden, setHidden] = useState<string[]>(args.hiddenDataKeys ?? []);
    return (
      <ChartLegend
        {...args}
        hiddenDataKeys={hidden}
        onClick={(entry) => {
          args.onClick?.(entry);
          const key = String(entry.dataKey);
          setHidden((h) =>
            h.includes(key) ? h.filter((k) => k !== key) : [...h, key]
          );
        }}
      />
    );
  },
};

/** Nine series in a narrow area wrap onto several rows. */
export const ManySeries: Story = {
  args: { payload: MANY, iconShape: 'square' },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420 }}>
        <Story />
      </div>
    ),
  ],
};
