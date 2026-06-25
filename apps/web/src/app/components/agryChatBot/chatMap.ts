/**
 * Pure mappers between the assistant backend and the chat UI model.
 *
 * Kept free of React / next-intl / axios imports (the api-client import is
 * type-only and erased at build) so jest can unit-test it directly — same
 * discipline as `mockEngine.routeMockReply`.
 */
import type { AssistantChatResponse } from '@agri/api-client/assistantApi';
import type { Conversation, EngineReply, Message } from './types';

/** Map a `POST /assistant/chat` response onto an EngineReply.
 *
 * - LLM free-text (`reply`) → stream it as prose.
 * - Rule-based (`reply_key`) → an i18n key the caller localizes; rendered
 *   instantly. Falls back to the generic key when neither is present.
 * - `intent === 'sitemap'` → attach the client-rendered sitemap card.
 */
export function mapChatResponse(res: AssistantChatResponse): EngineReply {
  const card =
    res?.intent === 'sitemap' ? ({ type: 'sitemap' } as const) : undefined;

  const reply = (res?.reply ?? '').trim();
  if (reply) {
    return { text: reply, card, stream: true };
  }

  const replyKey = res?.reply_key || 'misc.chatbot.mock.generic';
  return { replyKey, card, stream: false };
}

/** Serialize our in-memory messages to plain JSON (ISO timestamps) for the
 *  server's opaque `messages` field. */
export function messagesToJSON(messages: Message[]): unknown[] {
  return messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    isError: m.isError ?? false,
    card: m.card ?? null,
    timestamp:
      m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
  }));
}

interface RawMessage {
  id?: string;
  role?: string;
  content?: string;
  isError?: boolean;
  card?: Message['card'] | null;
  timestamp?: string;
}

/** Revive one server-stored message; tolerant of partial/legacy shapes. */
function reviveMessage(raw: RawMessage, index: number): Message {
  return {
    id: raw.id || `srv-${index}`,
    role: raw.role === 'user' ? 'user' : 'assistant',
    content: typeof raw.content === 'string' ? raw.content : '',
    isError: Boolean(raw.isError),
    card: raw.card ?? undefined,
    timestamp: raw.timestamp ? new Date(raw.timestamp) : new Date(0),
  };
}

interface RawConversation {
  id: string;
  title?: string;
  messages?: unknown[];
  createdAt?: string;
  updatedAt?: string;
}

/** Map a server conversation DTO onto the UI Conversation model. */
export function conversationFromDTO(dto: RawConversation): Conversation {
  const messages = Array.isArray(dto.messages) ? dto.messages : [];
  return {
    id: dto.id,
    title: dto.title || '',
    messages: messages.map((m, i) => reviveMessage((m ?? {}) as RawMessage, i)),
    createdAt: dto.createdAt ? new Date(dto.createdAt) : new Date(0),
    updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : new Date(0),
  };
}
