'use client';
/**
 * Shared chat state for the whole app. Both the dedicated /chat page and the
 * global right-edge slide-out consume this one context, so conversation
 * history stays unified no matter where you type.
 *
 * Replies come from a pluggable `ChatEngine`: the real agri-api assistant
 * (`/assistant/chat`) by default, or the local `mockEngine` when
 * `NEXT_PUBLIC_ASSISTANT_MOCK` is set (offline/dev). localStorage stays the
 * source of truth for history; `chatSync` mirrors it to the server best-effort.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { hydrateSsoSession } from '@agri/api-client/hydrateSsoSession';
import { loadConversations, saveConversations } from './chatHistoryStorage';
import { historyFor, isClearCommand } from './chatMap';
import { assistantApi } from '@agri/api-client/assistantApi';
import type { AssistantLanguage } from '@agri/api-client/assistantApi';
import { mockEngine, streamReply } from './mockEngine';
import { realEngine } from './realEngine';
import {
  pullConversations,
  pushConversation,
  removeConversation,
} from './chatSync';
import type { ChatCard, Conversation, EngineReply, Message } from './types';

interface ChatContextValue {
  conversations: Conversation[];
  activeId: string | null;
  activeConversation: Conversation | null;
  streaming: boolean;
  newConversation: () => void;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  sendMessage: (text: string) => void;
  stop: () => void;
  /** Answer language: auto (the farmer's own) or a fixed one. Persisted. */
  language: AssistantLanguage;
  setLanguage: (lang: AssistantLanguage) => void;
  /** Zone the farmer is asking about (remembered across sessions). */
  zoneId: number | null;
  setZoneId: (id: number | null) => void;
  /** Run / dismiss an action the assistant proposed on `messageId`. */
  confirmAction: (messageId: string) => void;
  dismissAction: (messageId: string) => void;
}

const LANGUAGE_KEY = 'agri.chat.language';
const ZONE_KEY = 'agri.chat.zoneId';
const LANGUAGES: AssistantLanguage[] = ['auto', 'ary', 'ar', 'fr', 'en'];

function readStored<T>(
  key: string,
  parse: (raw: string) => T | null
): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : parse(raw);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* storage full / disabled — the choice just isn't remembered */
  }
}

const ChatContext = createContext<ChatContextValue | null>(null);

// Real backend by default; the mock stays available for offline/dev behind a flag.
const USE_MOCK =
  process.env.NEXT_PUBLIC_ASSISTANT_MOCK === '1' ||
  process.env.NEXT_PUBLIC_ASSISTANT_MOCK === 'true';
const engine = USE_MOCK ? mockEngine : realEngine;

const uuid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const t = useTranslations();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [language, setLanguageState] = useState<AssistantLanguage>('auto');
  const [zoneId, setZoneIdState] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hydrated = useRef(false);

  // Restore the remembered language + zone once on mount (client only).
  useEffect(() => {
    const lang = readStored(LANGUAGE_KEY, (raw) =>
      LANGUAGES.includes(raw as AssistantLanguage)
        ? (raw as AssistantLanguage)
        : null
    );
    const zone = readStored(ZONE_KEY, (raw) =>
      Number.isInteger(Number(raw)) ? Number(raw) : null
    );
    /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from localStorage */
    if (lang) setLanguageState(lang);
    if (zone !== null) setZoneIdState(zone);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const setLanguage = useCallback((lang: AssistantLanguage) => {
    setLanguageState(lang);
    writeStored(LANGUAGE_KEY, lang);
  }, []);

  const setZoneId = useCallback((id: number | null) => {
    setZoneIdState(id);
    writeStored(ZONE_KEY, id === null ? null : String(id));
  }, []);
  // Whether the one-time server history pull has run (or is not needed).
  const serverPullDone = useRef(true);
  // Latest conversations, for the best-effort server push without re-subscribing.
  const conversationsRef = useRef<Conversation[]>([]);

  // Hydrate from localStorage once on mount (client only). On a fresh device
  // (no local history) pull the user's server-side threads; never clobber
  // existing local state with the server.
  useEffect(() => {
    const loaded = loadConversations();
    setConversations(loaded);
    setActiveId(loaded[0]?.id ?? null);
    hydrated.current = true;
    // Local history wins: only an empty device ever pulls from the server.
    serverPullDone.current = USE_MOCK || loaded.length > 0;
  }, []);

  // The provider lives in the root layout, so it is mounted on /login too and
  // survives the client-side router.push after signing in. Pull on the first
  // route that has a session rather than on mount: pulling while logged out
  // 401'd and (before the api.ts guard) reload-looped the login page (#138).
  const pathname = usePathname();
  useEffect(() => {
    if (serverPullDone.current || !hydrateSsoSession()) return;
    serverPullDone.current = true;
    pullConversations().then((server) => {
      // A stale token 401s and the api.ts interceptor clears the session:
      // retry on the next route once the user has signed in again.
      if (!hydrateSsoSession()) serverPullDone.current = false;
      if (server.length > 0) {
        setConversations((cur) => (cur.length > 0 ? cur : server));
        setActiveId((cur) => cur ?? server[0]?.id ?? null);
      }
    });
  }, [pathname]);

  // Persist whenever conversations change (after hydration). Keep the ref in
  // sync so the post-stream server push reads the committed state.
  useEffect(() => {
    conversationsRef.current = conversations;
    if (hydrated.current) saveConversations(conversations);
  }, [conversations]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  );

  const newConversation = useCallback(() => {
    abortRef.current?.abort();
    setActiveId(null);
  }, []);

  const selectConversation = useCallback((id: string) => {
    abortRef.current?.abort();
    setActiveId(id);
  }, []);

  const deleteConversation = useCallback(
    (id: string) => {
      if (!USE_MOCK) removeConversation(id);
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (id === activeId) setActiveId(next[0]?.id ?? null);
        return next;
      });
    },
    [activeId]
  );

  // Patch the most recent message of a conversation.
  const patchLastMessage = useCallback(
    (convId: string, patch: (m: Message) => Message) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId || c.messages.length === 0) return c;
          const messages = [...c.messages];
          messages[messages.length - 1] = patch(messages[messages.length - 1]);
          return { ...c, messages, updatedAt: new Date() };
        })
      );
    },
    []
  );

  // Resolve an engine reply to display text: literal LLM text, else the
  // localized i18n key (guarded so an unknown key degrades to the generic
  // placeholder instead of throwing / leaking the raw key).
  const resolveReplyText = useCallback(
    (reply: EngineReply): string => {
      if (reply.text) return reply.text;
      const key = reply.replyKey || 'misc.chatbot.mock.generic';
      const hasFn = (t as unknown as { has?: (k: string) => boolean }).has;
      if (typeof hasFn === 'function' && !hasFn.call(t, key)) {
        return t('misc.chatbot.mock.generic');
      }
      try {
        return t(key, reply.values);
      } catch {
        return t('misc.chatbot.mock.generic');
      }
    },
    [t]
  );

  // `/clear` — wipe the active thread locally + best-effort on the server,
  // leaving a single localized confirmation. No-op when no thread is active.
  const clearActiveThread = useCallback(() => {
    const targetId = activeId;
    if (!targetId) return;
    const now = new Date();
    const confirm: Message = {
      id: uuid(),
      role: 'assistant',
      content: t('misc.chatbot.cleared'),
      timestamp: now,
    };
    setConversations((prev) =>
      prev.map((c) =>
        c.id === targetId ? { ...c, messages: [confirm], updatedAt: now } : c
      )
    );
    if (!USE_MOCK) removeConversation(targetId);
  }, [activeId, t]);

  const sendMessage = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || streaming) return;
      if (isClearCommand(text)) {
        clearActiveThread();
        return;
      }

      // Prior turns of THIS thread, captured before the new pair is appended.
      const history = historyFor(
        conversationsRef.current.find((c) => c.id === activeId)?.messages ?? []
      );
      const now = new Date();
      const userMsg: Message = {
        id: uuid(),
        role: 'user',
        content: text,
        timestamp: now,
      };
      const assistantMsg: Message = {
        id: uuid(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      // Resolve (or create) the conversation we're appending to.
      let convId = activeId;
      setConversations((prev) => {
        if (convId && prev.some((c) => c.id === convId)) {
          return prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: [...c.messages, userMsg, assistantMsg],
                  updatedAt: now,
                }
              : c
          );
        }
        // New conversation: title from the first user message.
        convId = uuid();
        const title = text.length > 40 ? `${text.slice(0, 40).trim()}…` : text;
        const conv: Conversation = {
          id: convId,
          title,
          messages: [userMsg, assistantMsg],
          createdAt: now,
          updatedAt: now,
        };
        return [conv, ...prev];
      });
      if (!activeId) setActiveId(convId);

      const targetId = convId as string;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming(true);

      // Ask the engine, then stream the resolved reply into the assistant bubble.
      engine
        .respond({
          message: text,
          signal: controller.signal,
          history,
          zoneId,
          language,
        })
        .then((reply) => {
          if (controller.signal.aborted) return;
          if (reply.isError) {
            patchLastMessage(targetId, (m) =>
              m.role === 'assistant' ? { ...m, isError: true } : m
            );
          }
          const replyText = resolveReplyText(reply);
          const card: ChatCard | undefined = reply.card;
          const { sources, pendingAction } = reply;
          return streamReply(
            replyText,
            (chunk) =>
              patchLastMessage(targetId, (m) =>
                m.role === 'assistant'
                  ? { ...m, content: m.content + chunk }
                  : m
              ),
            controller.signal,
            { instant: !reply.stream }
          ).then(() => {
            if (card || sources || pendingAction) {
              patchLastMessage(targetId, (m) =>
                m.role === 'assistant'
                  ? {
                      ...m,
                      ...(card ? { card } : {}),
                      ...(sources ? { sources } : {}),
                      ...(pendingAction ? { pendingAction } : {}),
                    }
                  : m
              );
            }
          });
        })
        .finally(() => {
          if (controller.signal.aborted) {
            // Drop a never-filled assistant bubble if the send was aborted.
            setConversations((prev) =>
              prev.map((c) => {
                if (c.id !== targetId) return c;
                const last = c.messages[c.messages.length - 1];
                if (last?.role === 'assistant' && !last.content.trim()) {
                  return { ...c, messages: c.messages.slice(0, -1) };
                }
                return c;
              })
            );
          } else if (!USE_MOCK) {
            // Mirror the finished thread to the server (best-effort) once the
            // streamed state has committed.
            setTimeout(() => {
              const conv = conversationsRef.current.find(
                (c) => c.id === targetId
              );
              if (conv) pushConversation(conv);
            }, 0);
          }
          setStreaming(false);
        });
    },
    [
      activeId,
      streaming,
      patchLastMessage,
      resolveReplyText,
      clearActiveThread,
      zoneId,
      language,
    ]
  );

  // Update one message (by id) inside the active conversation.
  const patchMessage = useCallback(
    (messageId: string, patch: (m: Message) => Message) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.messages.some((m) => m.id === messageId)
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === messageId ? patch(m) : m
                ),
                updatedAt: new Date(),
              }
            : c
        )
      );
    },
    []
  );

  const syncThreadOf = useCallback((messageId: string) => {
    if (USE_MOCK) return;
    setTimeout(() => {
      const conv = conversationsRef.current.find((c) =>
        c.messages.some((m) => m.id === messageId)
      );
      if (conv) pushConversation(conv);
    }, 0);
  }, []);

  // The farmer confirmed a proposed action: only now is it executed, through
  // the authenticated tool route, as the farmer (never from the chat call).
  const confirmAction = useCallback(
    (messageId: string) => {
      const msg = conversationsRef.current
        .flatMap((c) => c.messages)
        .find((m) => m.id === messageId);
      const action = msg?.pendingAction;
      if (!action || action.state !== 'proposed') return;
      patchMessage(messageId, (m) => ({
        ...m,
        pendingAction: { ...action, state: 'running' },
      }));
      assistantApi
        .invokeTool(action.tool, action.params)
        .then((res) => {
          const err =
            typeof res?.data?.error === 'string' ? res.data.error : undefined;
          patchMessage(messageId, (m) => ({
            ...m,
            pendingAction: {
              ...action,
              state: err ? 'failed' : 'confirmed',
              ...(err ? { error: err } : {}),
            },
          }));
        })
        .catch(() =>
          patchMessage(messageId, (m) => ({
            ...m,
            pendingAction: {
              ...action,
              state: 'failed',
              error: t('misc.chatbot.action.networkError'),
            },
          }))
        )
        .finally(() => syncThreadOf(messageId));
    },
    [patchMessage, syncThreadOf, t]
  );

  const dismissAction = useCallback(
    (messageId: string) => {
      patchMessage(messageId, (m) =>
        m.pendingAction?.state === 'proposed'
          ? { ...m, pendingAction: { ...m.pendingAction, state: 'cancelled' } }
          : m
      );
      syncThreadOf(messageId);
    },
    [patchMessage, syncThreadOf]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, []);

  const value: ChatContextValue = {
    conversations,
    activeId,
    activeConversation,
    streaming,
    newConversation,
    selectConversation,
    deleteConversation,
    sendMessage,
    stop,
    language,
    setLanguage,
    zoneId,
    setZoneId,
    confirmAction,
    dismissAction,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within a ChatProvider');
  return ctx;
}
