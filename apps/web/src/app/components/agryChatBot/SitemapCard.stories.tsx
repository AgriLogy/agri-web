import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Box } from '@chakra-ui/react';
import { fn } from 'storybook/test';
import { SitemapCard } from './SitemapCard';

/**
 * Answer to the `/sitemap` (or `/help`) command in the assistant: every page
 * of the app with a one-line description; clicking a row navigates there and
 * closes the slide-out. Static list, no API call.
 */
const meta = {
  title: 'Assistant/SitemapCard',
  component: SitemapCard,
  decorators: [
    (Story) => (
      <Box maxW="420px" p="10px 13px" borderWidth="1px" borderRadius="12px">
        <Story />
      </Box>
    ),
  ],
  args: { onNavigate: fn() },
} satisfies Meta<typeof SitemapCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The full list of pages. */
export const Default: Story = {};
