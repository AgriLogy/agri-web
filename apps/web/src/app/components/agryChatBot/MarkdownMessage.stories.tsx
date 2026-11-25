import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Box } from '@chakra-ui/react';
import { MarkdownMessage } from './MarkdownMessage';

/**
 * Renders an assistant answer written in Markdown (bold, lists, tables,
 * links, code) as Chakra elements, never raw HTML. Used inside every
 * assistant bubble; font size and colour come from the bubble. Pure props.
 */
const meta = {
  title: 'Assistant/MarkdownMessage',
  component: MarkdownMessage,
  decorators: [
    (Story) => (
      <Box
        maxW="420px"
        p="10px 13px"
        borderWidth="1px"
        borderRadius="12px"
        fontSize="13.5px"
        lineHeight="1.55"
        dir="auto"
      >
        <Story />
      </Box>
    ),
  ],
  args: {
    content:
      'Pour la **Zone A2 — Agrumes**, voici ce que je vous conseille :\n\n- Irriguer *tôt le matin* (avant 8 h)\n- Vérifier le débit : il doit rester autour de `4,5 m³/h`\n- Contrôler la sonde moyenne dans 48 h\n\n1. Ouvrir la vanne V2\n2. Lancer le programme « Matin »',
  },
} satisfies Meta<typeof MarkdownMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Bold, italic, inline code, bullet and numbered lists. */
export const Lists: Story = {};

/** A GFM table, scrolling inside the bubble if it is too wide. */
export const Table: Story = {
  args: {
    content: [
      '### Humidité du sol — Zone A1',
      '',
      '| Profondeur | Valeur | Il y a |',
      '| --- | --- | --- |',
      '| 10 cm | 24 % | 1 h |',
      '| 30 cm | 29 % | 1 h |',
      '| 60 cm | 33 % | 2 h |',
    ].join('\n'),
  },
};

/** An answer citing a source with an external link (opens in a new tab). */
export const WithSourceLink: Story = {
  args: {
    content:
      "Le coefficient cultural (Kc) de la tomate en pleine production est d'environ **1,15**.\n\nSource : [FAO — Bulletin d'irrigation n° 56](https://www.fao.org/3/x0490e/x0490e00.htm)",
  },
};

/** Darija in Arabic script with a list: the block reads right-to-left. */
export const Darija: Story = {
  args: {
    content:
      'باش تنقص من الملوحة فـ **Zone B1 — Olivier**:\n\n- زيد شوية ديال الما فكل سقية\n- شوف الـ EC ديال الما كل سيمانة',
  },
};
