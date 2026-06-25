/**
 * Assistant backend client — the real counterpart to the chatbot's mock
 * engine. Wraps agri-api's `/assistant` surface (JWT-authed via the shared
 * axios `api`, which attaches the Bearer token + base URL):
 *
 *   POST   /assistant/chat                     — orchestrate a message
 *   GET    /assistant/conversations            — list the caller's threads
 *   PUT    /assistant/conversations/{clientId} — create/replace a thread
 *   DELETE /assistant/conversations/{clientId} — delete a thread
 */
import api from './api';

/** Response shape of `POST /assistant/chat`. `reply` is free text (LLM path),
 *  `reply_key` is an i18n key (rule-based path) — exactly one is typically set.
 *  `data` is the chosen tool's raw result (currently surfaced as prose). */
export interface AssistantChatResponse {
  intent: string;
  reply_key: string | null;
  reply: string | null;
  tool: string | null;
  data: unknown;
}

/** Server-side conversation record. `messages` is opaque JSON owned by the
 *  client (we round-trip our own Message shape with ISO timestamps). */
export interface AssistantConversationDTO {
  id: string;
  title: string;
  messages: unknown[];
  createdAt: string;
  updatedAt: string;
}

export interface AssistantConversationBody {
  title: string;
  messages: unknown[];
  created_at?: string;
  updated_at?: string;
}

export const assistantApi = {
  async chat(input: {
    message: string;
    zoneId?: number | null;
    context?: string | null;
  }): Promise<AssistantChatResponse> {
    const { data } = await api.post('/assistant/chat', {
      message: input.message,
      zone_id: input.zoneId ?? null,
      context: input.context ?? null,
    });
    return data as AssistantChatResponse;
  },

  async listConversations(): Promise<AssistantConversationDTO[]> {
    const { data } = await api.get('/assistant/conversations');
    return data as AssistantConversationDTO[];
  },

  async putConversation(
    clientId: string,
    body: AssistantConversationBody
  ): Promise<AssistantConversationDTO> {
    const { data } = await api.put(
      `/assistant/conversations/${encodeURIComponent(clientId)}`,
      body
    );
    return data as AssistantConversationDTO;
  },

  async deleteConversation(clientId: string): Promise<void> {
    await api.delete(
      `/assistant/conversations/${encodeURIComponent(clientId)}`
    );
  },
};
