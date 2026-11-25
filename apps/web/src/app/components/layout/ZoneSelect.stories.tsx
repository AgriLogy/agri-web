import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ZoneSelect, type ZoneOption } from './ZoneSelect';

const FLAT: ZoneOption[] = [
  { id: 1, name: 'Zone A1 — Tomates' },
  { id: 2, name: 'Zone A2 — Agrumes' },
  { id: 3, name: 'Zone B1 — Olivier' },
];

const GROUPED: ZoneOption[] = [
  {
    id: 1,
    name: 'Zone A1 — Tomates',
    sector_id: 1,
    sector_name: 'Parcelle Nord',
  },
  {
    id: 2,
    name: 'Zone A2 — Agrumes',
    sector_id: 1,
    sector_name: 'Parcelle Nord',
  },
  {
    id: 3,
    name: 'Zone B1 — Olivier',
    sector_id: 2,
    sector_name: 'Parcelle Sud',
  },
  { id: 4, name: 'Serre 1', sector_id: null, sector_name: null },
];

/**
 * Zone dropdown in the page info bar of the analytics pages. Zones are
 * grouped under their sector when the farm has sectors. The page loads the
 * list from `GET /zones`; this component only renders it.
 */
const meta = {
  title: 'Mise en page/ZoneSelect',
  component: ZoneSelect,
  args: { zones: FLAT, value: 1, onChange: fn() },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return (
      <ZoneSelect
        {...args}
        value={value}
        onChange={(id) => {
          setValue(id);
          args.onChange(id);
        }}
      />
    );
  },
} satisfies Meta<typeof ZoneSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Farm without sectors: a plain list. */
export const Flat: Story = {};

/** Zones grouped by sector; unassigned zones under "Non assignées". */
export const GroupedBySector: Story = { args: { zones: GROUPED, value: 3 } };

/** No zones yet (list still loading or empty account). */
export const NoZones: Story = { args: { zones: [], value: null } };

/** Very long zone name: the select keeps its width on phones. */
export const LongName: Story = {
  args: {
    zones: [
      {
        id: 9,
        name: 'Zone C4 — Myrtilliers sous tunnel, goutte-à-goutte double rampe',
      },
      ...FLAT,
    ],
    value: 9,
  },
};
