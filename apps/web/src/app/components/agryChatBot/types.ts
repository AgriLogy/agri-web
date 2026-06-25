export type MessageRole = 'user' | 'assistant';

export type ChatErrorCode =
  | 'timeout'
  | 'overloaded'
  | 'rate_limit'
  | 'internal'
  | 'network';

/** A single labelled reading in a metrics card. */
export interface ChatMetricItem {
  label: string;
  value: number | string | null;
  unit?: string;
  status?: string;
}

/** A single active-alert row. */
export interface ChatAlertItem {
  name: string;
  zone?: string | null;
  condition?: string | null;
  threshold?: number | null;
  severity?: string;
}

/** A single recent-notification row. */
export interface ChatNotificationItem {
  title: string;
  message?: string;
  date?: string | null;
}

/** Structured attachment rendered beneath an assistant message: the sitemap
 *  card (`/sitemap`), or a per-intent data card built from the assistant
 *  backend's tool result (`POST /assistant/chat` → `data`). */
export type ChatCard =
  | { type: 'sitemap' }
  | { type: 'metrics'; items: ChatMetricItem[] }
  | { type: 'alerts'; items: ChatAlertItem[] }
  | { type: 'notifications'; items: ChatNotificationItem[] }
  | { type: 'error'; message: string };

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  isError?: boolean;
  /** Optional structured attachment (sitemap, etc.). */
  card?: ChatCard;
  timestamp: Date;
}

/** A reply produced by a chat engine (mock or real). The React layer resolves
 *  `replyKey` (an i18n key) or uses literal `text` (LLM free text), then
 *  streams the result and attaches any `card`. */
export interface EngineReply {
  /** Literal reply text (LLM free-text path). Takes precedence over replyKey. */
  text?: string;
  /** i18n key resolved by the caller (rule-based path). */
  replyKey?: string;
  /** Interpolation values for the i18n lookup. */
  values?: Record<string, string>;
  /** Structured attachment rendered after the text (e.g. the sitemap card). */
  card?: ChatCard;
  /** Simulate token streaming (false = render instantly, e.g. command results). */
  stream: boolean;
  /** Mark the reply as an error bubble (failed request, etc.). */
  isError?: boolean;
}

/** Pluggable chat backend. `mockEngine` and `realEngine` both implement this so
 *  ChatContext can swap between them behind a flag. */
export interface ChatEngine {
  respond(input: {
    message: string;
    signal: AbortSignal;
  }): Promise<EngineReply>;
}

/** A persisted conversation thread shown in the assistant's history. */
export interface Conversation {
  id: string;
  /** Derived from the first user message; falls back to a localized default. */
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}
