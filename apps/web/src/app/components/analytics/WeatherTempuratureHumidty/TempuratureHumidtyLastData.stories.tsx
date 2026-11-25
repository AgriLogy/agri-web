import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Box } from '@chakra-ui/react';
import TempuratureHumidtyLastData from './TempuratureHumidtyLastData';
import { humiditySeries, temperatureSeries } from '@/stories/mocks/sensors';

/**
 * "Last data" card next to the temperature & humidity chart: latest air
 * temperature and humidity with how long ago they were read, and an "add
 * alert" button for editors. Same series as the chart, as props.
 */
const meta = {
  title: 'Capteurs/Température & humidité/TempuratureHumidtyLastData',
  component: TempuratureHumidtyLastData,
  decorators: [
    (Story) => (
      <Box maxW="320px">
        <Story />
      </Box>
    ),
  ],
  args: {
    temperatureData: temperatureSeries(),
    humidityData: humiditySeries(),
  },
} satisfies Meta<typeof TempuratureHumidtyLastData>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Latest temperature and humidity. */
export const Default: Story = {};

/** A heat wave reading: 44.5 °C and 9 % humidity. */
export const ExtremeValues: Story = {
  args: {
    temperatureData: [{ ...temperatureSeries(1).at(-1)!, value: 44.5 }],
    humidityData: [{ ...humiditySeries(1).at(-1)!, value: 9 }],
  },
};

/** No reading in the range. */
export const NoData: Story = {
  args: { temperatureData: [], humidityData: [] },
};
