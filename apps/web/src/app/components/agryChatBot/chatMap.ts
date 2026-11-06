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
  ChatPendingAction,
  ChatSource,
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
  const sources = sourcesFrom(res);
  // An AI answer that lists its sources (each with its reading time) doesn't
  // also get the raw data card: those rows carry no dates, so a months-old
  // value would look current. Rule-based command replies keep their cards.
  const card =
    res?.intent === 'llm' && sources.length ? undefined : dataCardFor(res);
  const pendingAction = pendingActionFrom(res);
  const extras = {
    ...(sources.length ? { sources } : {}),
    ...(pendingAction ? { pendingAction } : {}),
  };

  const reply = (res?.reply ?? '').trim();
  if (reply) {
    return { text: reply, card, stream: true, ...extras };
  }

  // The AI engine failed and the server fell back to the keyword matcher,
  // which found nothing: say so instead of the generic "try a command".
  if (res?.fallback_reason && res?.intent === 'smalltalk') {
    return { replyKey: 'misc.chatbot.llmUnavailable', stream: false };
  }

  const replyKey = res?.reply_key || 'misc.chatbot.mock.generic';
  return { replyKey, card, stream: false, ...extras };
}

/** The farm data an LLM answer was based on (label, value, reading time). */
export function sourcesFrom(res: AssistantChatResponse): ChatSource[] {
  return arr(res?.sources).flatMap((raw) => {
    const s = (raw ?? {}) as Record<string, unknown>;
    const tool = str(s.tool);
    if (!tool) return [];
    const items = arr(s.items).map((rawItem) => {
      const i = (rawItem ?? {}) as Record<string, unknown>;
      const value =
        typeof i.value === 'number' || typeof i.value === 'string'
          ? i.value
          : null;
      return {
        label: str(i.label),
        value,
        unit: str(i.unit),
        asOf: str(i.as_of) || null,
      };
    });
    const source: ChatSource = { tool, asOf: str(s.as_of) || null, items };
    if (str(s.error)) source.error = str(s.error);
    return [source];
  });
}

/** An action the assistant proposed; the farmer must confirm it. */
export function pendingActionFrom(
  res: AssistantChatResponse
): ChatPendingAction | undefined {
  const p = res?.pending_action;
  if (!p || typeof p !== 'object' || !str(p.tool)) return undefined;
  const params =
    p.params && typeof p.params === 'object'
      ? (p.params as Record<string, unknown>)
      : {};
  return { tool: p.tool, params, state: 'proposed' };
}

/** Text history sent with a new message: the last `limit` finished turns,
 *  skipping error bubbles and empty placeholders. */
export function historyFor(
  messages: Message[],
  limit = 12
): { role: Message['role']; content: string }[] {
  return messages
    .filter((m) => !m.isError && m.content.trim())
    .slice(-limit)
    .map((m) => ({ role: m.role, content: m.content.trim() }));
}

/** How old a reading is, for the "data used" list. `stale` past 2 days, the
 *  same threshold the assistant is told to treat as outdated. */
export function readingAge(
  asOf: string | null,
  now: Date = new Date()
): { hours: number; stale: boolean } | null {
  if (!asOf) return null;
  const t = Date.parse(asOf);
  if (Number.isNaN(t)) return null;
  const hours = Math.max(0, (now.getTime() - t) / 3_600_000);
  return { hours, stale: hours > 48 };
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
    sources: m.sources ?? null,
    pendingAction: m.pendingAction ?? null,
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
  sources?: Message['sources'] | null;
  pendingAction?: Message['pendingAction'] | null;
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
    sources: raw.sources ?? undefined,
    pendingAction: raw.pendingAction ?? undefined,
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
