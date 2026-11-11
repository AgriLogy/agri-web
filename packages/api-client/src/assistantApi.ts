/**
 * Assistant backend client — the real counterpart to the chatbot's mock
 * engine. Wraps agri-api's `/assistant` surface (JWT-authed via the shared
 * axios `api`, which attaches the Bearer token + base URL):
 *
 *   POST   /assistant/chat                     — orchestrate a message
 *   POST   /assistant/tools/{name}             — run a confirmed action
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
  /** LLM path only: what the answer was based on, with reading times. */
  sources?: AssistantSource[];
  /** LLM path only: an action the farmer must confirm (never auto-executed). */
  pending_action?: AssistantPendingAction;
  model?: string;
  /** LLM path failed and the rule-based reply was used instead. */
  fallback_reason?: string;
}

export interface AssistantSourceItem {
  label: string | null;
  value: number | string | null;
  unit: string | null;
  as_of: string | null;
}

/** A knowledge-base article the answer cited (agri-api#483). */
export interface AssistantSourceArticle {
  id: number;
  title: string;
  sources: { title: string; url: string }[];
  reviewed_at: string | null;
  /** Its review date has passed: it may be outdated. */
  review_overdue: boolean;
}

export interface AssistantSource {
  tool: string;
  as_of: string | null;
  items?: AssistantSourceItem[];
  /** search_knowledge only: the approved articles it returned. */
  articles?: AssistantSourceArticle[];
  error?: string;
}

export interface AssistantPendingAction {
  tool: string;
  params: Record<string, unknown>;
}

/** Chat language: answer in the farmer's language, or a fixed one. */
export type AssistantLanguage = 'auto' | 'ary' | 'ar' | 'fr' | 'en';

export interface AssistantHistoryItem {
  role: 'user' | 'assistant';
  content: string;
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
    history?: AssistantHistoryItem[];
    language?: AssistantLanguage;
  }): Promise<AssistantChatResponse> {
    const { data } = await api.post('/assistant/chat', {
      message: input.message,
      zone_id: input.zoneId ?? null,
      context: input.context ?? null,
      history: input.history ?? [],
      language: input.language ?? 'auto',
    });
    return data as AssistantChatResponse;
  },
  /** Run one assistant tool as the caller: used to execute a confirmed
   *  `pending_action` (the server never runs a write from chat). */
  async invokeTool(
    name: string,
    params: Record<string, unknown>
  ): Promise<{ tool: string; data: Record<string, unknown> }> {
    const { data } = await api.post(
      `/assistant/tools/${encodeURIComponent(name)}`,
      { params }
    );
    return data as { tool: string; data: Record<string, unknown> };
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
