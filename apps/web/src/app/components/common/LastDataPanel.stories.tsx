import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { HStack, Stack, Text } from '@chakra-ui/react';
import { Droplets, Thermometer } from 'lucide-react';
import LastDataPanel from './LastDataPanel';

function Reading({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <HStack justify="space-between" spacing={3}>
      <HStack spacing={2} minW={0}>
        {icon}
        <Text fontSize="sm" color="app.text.muted" noOfLines={1}>
          {label}
        </Text>
      </HStack>
      <Text fontWeight="semibold" whiteSpace="nowrap">
        {value}
      </Text>
    </HStack>
  );
}

const SOIL_READINGS = (
  <Stack spacing={3}>
    <Text fontWeight="semibold">Dernière mesure · il y a 12 min</Text>
    <Reading
      icon={<Droplets size={16} aria-hidden />}
      label="Humidité 10 cm"
      value="24,6 %"
    />
    <Reading
      icon={<Droplets size={16} aria-hidden />}
      label="Humidité 30 cm"
      value="31,2 %"
    />
    <Reading
      icon={<Thermometer size={16} aria-hidden />}
      label="Température du sol"
      value="21,4 °C"
    />
  </Stack>
);

/**
 * Card shell for the "dernière valeur" column next to each chart. A
 * `variant` adds the brand-tinted background and accent border. On phones
 * decorative icons are hidden. Pure layout; the content comes from the
 * caller.
 */
const meta = {
  title: 'Commun/LastDataPanel',
  component: LastDataPanel,
  args: { children: SOIL_READINGS, variant: 'waterSoil' },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 340 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LastDataPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** With a variant: tinted background and accent border. */
export const WithVariant: Story = {};

/** No variant: plain white card. */
export const Plain: Story = { args: { variant: undefined } };

/** No reading yet: the card keeps its height with a short message. */
export const NoReading: Story = {
  args: {
    children: (
      <Text color="app.text.muted" fontSize="sm">
        Aucune mesure reçue sur la période.
      </Text>
    ),
  },
};
