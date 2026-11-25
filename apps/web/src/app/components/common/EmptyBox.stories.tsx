import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import EmptyBox from './EmptyBox';

/**
 * Placeholder shown where a chart or list has nothing to show yet, or while
 * it loads. Default texts come from `misc.emptyBox.*`.
 */
const meta = {
  title: 'Commun/EmptyBox',
  component: EmptyBox,
  args: { variant: 'empty' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['empty', 'loading'] },
  },
} satisfies Meta<typeof EmptyBox>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No data for the chosen period. */
export const Empty: Story = {};

/** Spinner while the readings load. */
export const Loading: Story = { args: { variant: 'loading' } };

/** A custom message replaces the default one. */
export const CustomText: Story = {
  args: { text: 'Aucune mesure sur les 7 derniers jours' },
};
