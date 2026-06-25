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

/** A persisted conversation thread shown in the assistant's history. */
export interface Conversation {
  id: string;
  /** Derived from the first user message; falls back to a localized default. */
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}
