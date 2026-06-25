/**
 * Best-effort server sync for chat history.
 *
 * localStorage (`chatHistoryStorage`) stays the SOURCE OF TRUTH so the chat
 * keeps working offline and across reloads; this module mirrors changes to
 * agri-api's `/assistant/conversations` so threads follow the user across
 * devices. Every call is fire-and-forget — a failed/blocked request never
 * breaks the chat. The server is only pulled when local history is empty
 * (first use on a new device); we never clobber local with server state.
 */
import { assistantApi } from '@agri/api-client/assistantApi';
import { conversationFromDTO, messagesToJSON } from './chatMap';
import type { Conversation } from './types';

/** Pull the user's server-side threads. Returns [] on any failure. */
export async function pullConversations(): Promise<Conversation[]> {
  try {
    const dtos = await assistantApi.listConversations();
    return dtos
      .map(conversationFromDTO)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  } catch {
    return [];
  }
}

/** Mirror one conversation to the server (fire-and-forget). */
export function pushConversation(conv: Conversation): void {
  void assistantApi
    .putConversation(conv.id, {
      title: conv.title,
      messages: messagesToJSON(conv.messages),
      created_at: conv.createdAt.toISOString(),
      updated_at: conv.updatedAt.toISOString(),
    })
    .catch(() => {
      /* offline / unauthorized — local copy remains the source of truth */
    });
}

/** Delete one conversation server-side (fire-and-forget). */
export function removeConversation(id: string): void {
  void assistantApi.deleteConversation(id).catch(() => {
    /* non-fatal */
  });
}
