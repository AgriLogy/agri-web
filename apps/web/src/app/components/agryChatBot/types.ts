export type MessageRole = 'user' | 'assistant';

export type ChatErrorCode =
  | 'timeout'
  | 'overloaded'
  | 'rate_limit'
  | 'internal'
  | 'network';

/** Structured attachment rendered beneath an assistant message (e.g. the
 *  sitemap card produced by the `/sitemap` command). */
export type ChatCard = { type: 'sitemap' };

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
