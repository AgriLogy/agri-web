/**
 * Pure mappers between the assistant backend and the chat UI model.
 *
 * Kept free of React / next-intl / axios imports (the api-client import is
 * type-only and erased at build) so jest can unit-test it directly — same
 * discipline as `mockEngine.routeMockReply`.
 */
import type { AssistantChatResponse } from '@agri/api-client/assistantApi';
import type {
  ChatAlertItem,
  ChatCard,
  ChatMetricItem,
  ChatNotificationItem,
  Conversation,
  EngineReply,
  Message,
} from './types';

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Build a per-intent data card from a chat response's `data` (the chosen
 *  tool's raw result). Pure + defensive: unknown/empty shapes → undefined so
 *  the caller falls back to the intro text. `sitemap` keeps its client card. */
export function dataCardFor(res: AssistantChatResponse): ChatCard | undefined {
  if (res?.intent === 'sitemap') return { type: 'sitemap' };

  const data = res?.data;
  if (!data || typeof data !== 'object') return undefined;
  const d = data as Record<string, unknown>;

  if (typeof d.error === 'string' && d.error) {
    return { type: 'error', message: d.error };
  }

  if (Array.isArray(d.alerts)) {
    const items: ChatAlertItem[] = arr(d.alerts).map((raw) => {
      const a = (raw ?? {}) as Record<string, unknown>;
      return {
        name: str(a.name),
        zone: typeof a.zone === 'string' ? a.zone : null,
        condition: typeof a.condition === 'string' ? a.condition : null,
        threshold: num(a.threshold),
        severity: str(a.severity) || undefined,
      };
    });
    return { type: 'alerts', items };
  }

  if (Array.isArray(d.metrics)) {
    const items: ChatMetricItem[] = arr(d.metrics).map((raw) => {
      const m = (raw ?? {}) as Record<string, unknown>;
      return {
        label: str(m.label) || str(m.key),
        value: num(m.value) ?? (typeof m.value === 'string' ? m.value : null),
        unit: str(m.unit) || undefined,
        status: str(m.status) || undefined,
      };
    });
    return { type: 'metrics', items };
  }

  if (Array.isArray(d.notifications)) {
    const items: ChatNotificationItem[] = arr(d.notifications).map((raw) => {
      const n = (raw ?? {}) as Record<string, unknown>;
      return {
        title: str(n.title),
        message: str(n.message) || undefined,
        date: typeof n.date === 'string' ? n.date : null,
      };
    });
    return { type: 'notifications', items };
  }

  return undefined;
}

/** True when a message is the client-side `/clear` command (slash form or a
 *  fr/en/ar natural phrase). The thread wipe is handled in ChatContext, never
 *  sent to the backend. */
export function isClearCommand(message: string): boolean {
  const t = message.trim().toLowerCase().replace(/^\/+/, '');
  return (
    t === 'clear' ||
    t === 'effacer' ||
    t === 'effacer la conversation' ||
    t === 'vider' ||
    t === 'مسح' ||
    t === 'مسح المحادثة'
  );
}

/** Map a `POST /assistant/chat` response onto an EngineReply.
 *
 * - LLM free-text (`reply`) → stream it as prose.
 * - Rule-based (`reply_key`) → an i18n key the caller localizes; rendered
 *   instantly. Falls back to the generic key when neither is present.
 * - `intent === 'sitemap'` → attach the client-rendered sitemap card.
 */
export function mapChatResponse(res: AssistantChatResponse): EngineReply {
  const card = dataCardFor(res);

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
