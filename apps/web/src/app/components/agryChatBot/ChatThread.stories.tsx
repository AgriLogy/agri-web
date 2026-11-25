import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Box } from '@chakra-ui/react';
import { expect, userEvent, within } from 'storybook/test';
import { http, HttpResponse } from 'msw';
import { ChatThread } from './ChatThread';
import { ChatProvider } from './ChatContext';
import type { Conversation } from './types';
import { api, demoZones } from '@/stories/mocks/api';

const ago = (min: number) => new Date(Date.now() - min * 60_000);

/** A finished Darija exchange, with the readings the answer was based on. */
const DARIJA_THREAD: Conversation = {
  id: 'demo-thread-1',
  title: 'Wach nsqi Zone A1 lyouma?',
  createdAt: ago(6),
  updatedAt: ago(5),
  messages: [
    {
      id: 'm1',
      role: 'user',
      content: 'واش خاصني نسقي Zone A1 اليوما؟',
      timestamp: ago(6),
    },
    {
      id: 'm2',
      role: 'assistant',
      content:
        'إيه، الرطوبة ديال التربة فـ **Zone A1 — Tomates** نزلات لـ **22%** (تحت 25%). والـ ET₀ ديال البارح كانت 5,3 مم.\n\n- سقي غدا الصباح بكري، تقريبا **50 دقيقة**\n- عاود شوف السوند ديال 30 سم من بعد يومين',
      timestamp: ago(5),
      sources: [
        {
          tool: 'get_latest_readings',
          asOf: ago(65).toISOString(),
          items: [
            {
              label: 'Humidité du sol (30 cm)',
              value: 22.1,
              unit: '%',
              asOf: ago(65).toISOString(),
            },
            {
              label: 'ET₀ (veille)',
              value: 5.3,
              unit: 'mm',
              asOf: ago(60 * 14).toISOString(),
            },
          ],
        },
        {
          tool: 'search_knowledge',
          asOf: null,
          items: [],
          articles: [
            {
              id: 7,
              title: 'Irrigation goutte-à-goutte de la tomate',
              sources: [
                {
                  title: "FAO — Bulletin d'irrigation n° 56",
                  url: 'https://www.fao.org/3/x0490e/x0490e00.htm',
                },
              ],
              reviewOverdue: false,
            },
          ],
        },
      ],
    },
  ],
};

const HISTORY_KEY = 'agrilogy_chat_history';

/** Puts the story's conversations in localStorage before ChatProvider loads. */
function seedHistory(conversations: Conversation[]) {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(conversations));
    window.localStorage.removeItem('agri.chat.language');
    window.localStorage.removeItem('agri.chat.zoneId');
  } catch {
    /* storage disabled: the thread just starts empty */
  }
}

const voice = (active: boolean) =>
  http.get(api('/assistant/voice'), () =>
    HttpResponse.json({ active, max_seconds: 120 })
  );

/**
 * The assistant's conversation: welcome message, bubbles, data cards, the
 * "data used" line under AI answers, and the input with language/zone
 * pickers and the microphone. Same component on `/chat` and in the global
 * slide-out; it reads the shared ChatProvider (wrapped here, with the
 * history it keeps in localStorage seeded per story).
 *
 * Data: `POST /assistant/chat`, `GET /assistant/voice`, `GET /zones`,
 * `GET|PUT /assistant/conversations`.
 */
const meta = {
  title: 'Assistant/ChatThread',
  component: ChatThread,
  parameters: {
    layout: 'centered',
    chatHistory: [] as Conversation[],
    msw: {
      handlers: {
        voice: [voice(false)],
        assistant: [
          http.get(api('/zones'), () => HttpResponse.json(demoZones)),
          http.get(api('/assistant/conversations'), () =>
            HttpResponse.json([])
          ),
          http.put(api('/assistant/conversations/:id'), () =>
            HttpResponse.json({})
          ),
        ],
        chat: [
          http.post(api('/assistant/chat'), () =>
            HttpResponse.json({
              intent: 'llm',
              reply:
                'Oui : le sol de la **Zone A1** est à 22 %, sous le seuil conseillé. Irriguez demain matin.',
              reply_key: null,
              tool: null,
              data: null,
            })
          ),
        ],
      },
    },
  },
  decorators: [
    (Story, ctx) => {
      seedHistory((ctx.parameters.chatHistory as Conversation[]) ?? []);
      return (
        <ChatProvider>
          <Box
            w="420px"
            h="600px"
            borderWidth="1px"
            borderRadius="12px"
            overflow="hidden"
          >
            <Story />
          </Box>
        </ChatProvider>
      );
    },
  ],
} satisfies Meta<typeof ChatThread>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No conversation yet: only the welcome message. */
export const Empty: Story = {};

/** A Darija question and its answer, with the readings and article it used. */
export const DarijaConversation: Story = {
  parameters: { chatHistory: [DARIJA_THREAD] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole('button', { name: /Données utilisées/ })
    );
  },
};

/** The server is overloaded (HTTP 503): the answer turns into a red error. */
export const ServerError: Story = {
  parameters: {
    msw: {
      handlers: {
        chat: [
          http.post(api('/assistant/chat'), () =>
            HttpResponse.json({ detail: 'busy' }, { status: 503 })
          ),
        ],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      canvas.getByRole('textbox'),
      'Chhal men lma khass Zone A2?'
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Envoyer' }));
    await expect(
      await canvas.findByText(/Le serveur est occupé/)
    ).toBeInTheDocument();
  },
};

/** The AI is switched off on the server: the assistant says it is unavailable. */
export const AssistantUnavailable: Story = {
  parameters: {
    msw: {
      handlers: {
        chat: [
          http.post(api('/assistant/chat'), () =>
            HttpResponse.json({
              intent: 'smalltalk',
              reply: null,
              reply_key: null,
              tool: null,
              data: null,
              fallback_reason: 'llm_disabled',
            })
          ),
        ],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      canvas.getByRole('textbox'),
      'Kifach nhreb mn lmard dyal tomatich?'
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Envoyer' }));
  },
};

/** `GET /assistant/voice` says server voice is on: the microphone shows. */
export const VoiceActive: Story = {
  parameters: {
    msw: { handlers: { voice: [voice(true)] } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole('button', { name: 'Dictez votre question' })
    ).toBeVisible();
  },
};
