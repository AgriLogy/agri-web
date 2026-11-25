import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Box } from '@chakra-ui/react';
import { AgrilogyMessageBubble } from './MessageBubble';

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);

/**
 * One chat bubble in the assistant (`/chat` page and the right-edge
 * slide-out). The farmer's messages sit on the right in green, the
 * assistant's on the left in grey and are rendered as Markdown; errors are
 * red. Text direction follows the content, so Darija reads right-to-left.
 * Pure props, no API call.
 */
const meta = {
  title: 'Assistant/MessageBubble',
  component: AgrilogyMessageBubble,
  decorators: [
    (Story) => (
      <Box maxW="440px">
        <Story />
      </Box>
    ),
  ],
  args: {
    message: {
      id: 'u1',
      role: 'user',
      content: 'Wach khassni nsqi Zone A1 lyouma?',
      timestamp: minutesAgo(3),
    },
  },
} satisfies Meta<typeof AgrilogyMessageBubble>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A question typed by the farmer (right, green). */
export const UserMessage: Story = {};

/** An assistant answer in Moroccan Darija (Arabic script, right-to-left). */
export const AssistantDarija: Story = {
  args: {
    message: {
      id: 'a1',
      role: 'assistant',
      content:
        'الرطوبة ديال التربة فـ **Zone A1 — Tomates** هي 24%، وهادشي ناقص شوية. نصيحتي: سقي الصباح بكري، تقريبا **45 دقيقة** بالگوتة گوتة.',
      timestamp: minutesAgo(2),
    },
  },
};

/** A long assistant answer with a list: wraps inside the 78% max width. */
export const LongAnswer: Story = {
  args: {
    message: {
      id: 'a2',
      role: 'assistant',
      content: [
        "D'après les capteurs de la **Zone A1 — Tomates** sur les 7 derniers jours :",
        '',
        '1. L’humidité du sol à 30 cm est descendue à 22 % hier soir, sous le seuil conseillé (25 %).',
        '2. L’ET₀ moyenne est de 5,1 mm/jour, typique d’une fin de printemps dans le Souss.',
        '3. Le vent de chergui de mardi a fait monter la demande en eau de près de 20 %.',
        '',
        'Je vous conseille d’allonger l’irrigation du matin de 10 minutes pendant les trois prochains jours, puis de revérifier la sonde moyenne.',
      ].join('\n'),
      timestamp: minutesAgo(1),
    },
  },
};

/** A failed request: red bubble, text shown as-is (no Markdown). */
export const ErrorMessage: Story = {
  args: {
    message: {
      id: 'e1',
      role: 'assistant',
      content: 'Le serveur est occupé. Veuillez réessayer dans un moment.',
      isError: true,
      timestamp: minutesAgo(0),
    },
  },
};

/** While the answer is coming: three bouncing dots. */
export const Typing: Story = {
  args: {
    message: {
      id: 'a3',
      role: 'assistant',
      content: '',
      timestamp: minutesAgo(0),
    },
    isTyping: true,
  },
};
