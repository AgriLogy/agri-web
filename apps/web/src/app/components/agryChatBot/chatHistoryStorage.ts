/**
 * Persistence for assistant conversations. This is the "mock backend" for
 * chat history — it mirrors the repo's other localStorage helpers
 * (`STORAGE_KEY` + JSON, no expiry). When a real backend lands, only this
 * module and `mockEngine` need to change.
 *
 * Pure and dependency-free (SSR-guarded) so it stays jest-testable.
 */
import type { Conversation, Message } from './types';

const STORAGE_KEY = 'agrilogy_chat_history';

const isBrowser = () => typeof window !== 'undefined';

/** Dates are stored as ISO strings; revive them on load. */
function reviveMessage(
  raw: Omit<Message, 'timestamp'> & { timestamp: string }
): Message {
  return { ...raw, timestamp: new Date(raw.timestamp) };
}

export function loadConversations(): Conversation[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<
      Omit<Conversation, 'messages' | 'createdAt' | 'updatedAt'> & {
        messages: Array<Omit<Message, 'timestamp'> & { timestamp: string }>;
        createdAt: string;
        updatedAt: string;
      }
    >;
    return parsed.map((c) => ({
      ...c,
      messages: c.messages.map(reviveMessage),
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
    }));
  } catch {
    return [];
  }
}

export function saveConversations(conversations: Conversation[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch {
    // storage full / unavailable — non-fatal for a mock history
  }
}
