import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Box, Stack, Text } from '@chakra-ui/react';
import ChartLastDataShell from './ChartLastDataShell';
import ChartStateView from './ChartStateView';
import LastDataPanel from './LastDataPanel';

const CHART = (
  <Box flex={2} minW={0}>
    <ChartStateView height={280}>
      <svg
        viewBox="0 0 300 100"
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        role="img"
        aria-label="Température de l'air"
      >
        <polyline
          fill="none"
          stroke="#2f9e5b"
          strokeWidth="2"
          points="0,70 25,66 50,58 75,45 100,32 125,25 150,22 175,28 200,40 225,55 250,63 275,68 300,70"
        />
      </svg>
    </ChartStateView>
  </Box>
);

const LAST = (
  <Box flex={1} minW={0}>
    <LastDataPanel variant="tempHumidity">
      <Stack spacing={2}>
        <Text fontWeight="semibold">Dernière mesure</Text>
        <Text fontSize="2xl" fontWeight="bold">
          31,8 °C
        </Text>
        <Text fontSize="sm" color="app.text.muted">
          Humidité de l&apos;air 38 % · il y a 8 min
        </Text>
      </Stack>
    </LastDataPanel>
  </Box>
);

/**
 * Chart + "dernière valeur" column, side by side on desktop and stacked on
 * phones, with an eye button (desktop only) to hide the chart. Used by every
 * sensor block on the analytics pages. No data source of its own.
 */
const meta = {
  title: 'Commun/ChartLastDataShell',
  component: ChartLastDataShell,
  args: { chart: CHART, lastData: LAST },
} satisfies Meta<typeof ChartLastDataShell>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Chart and latest reading side by side. */
export const Default: Story = {};

/** The chart is still loading; the side panel already shows. */
export const ChartLoading: Story = {
  args: {
    chart: (
      <Box flex={2} minW={0}>
        <ChartStateView loading height={280}>
          {null}
        </ChartStateView>
      </Box>
    ),
  },
};

/** After clicking the eye button: chart hidden, only the panel remains. */
export const ChartHidden: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The eye toggle is the shell's only button (name depends on locale).
    const [toggle] = await canvas.findAllByRole('button');
    await userEvent.click(toggle);
    await expect(
      canvas.queryByRole('img', { name: "Température de l'air" })
    ).toBeNull();
  },
};
