import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Loading from './Loading';

/**
 * Centred brand spinner, 200 px tall, used as a simple page/section
 * placeholder while data loads. No props, no data source.
 */
const meta = {
  title: 'Commun/Loading',
  component: Loading,
} satisfies Meta<typeof Loading>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The spinner alone. */
export const Default: Story = {};

/** Inside a bordered card, as it appears in place of a section. */
export const InCard: Story = {
  decorators: [
    (Story) => (
      <div
        style={{
          maxWidth: 480,
          border: '1px solid rgba(128,128,128,0.3)',
          borderRadius: 12,
        }}
      >
        <Story />
      </div>
    ),
  ],
};
