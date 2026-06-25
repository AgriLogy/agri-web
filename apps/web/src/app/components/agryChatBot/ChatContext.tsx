'use client';
/**
 * Shared chat state for the whole app. Both the dedicated /chat page and the
 * global right-edge slide-out consume this one context, so conversation
 * history stays unified no matter where you type.
 *
 * Replies come from the mock engine today; swapping in a real backend means
 * changing `mockEngine` + `chatHistoryStorage` only — this context's API is
 * the seam.
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
import { loadConversations, saveConversations } from './chatHistoryStorage';
import { routeMockReply, streamReply } from './mockEngine';
import type { ChatCard, Conversation, Message } from './types';

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
}

const ChatContext = createContext<ChatContextValue | null>(null);

const uuid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const t = useTranslations();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const hydrated = useRef(false);

  // Hydrate from localStorage once on mount (client only).
  useEffect(() => {
    const loaded = loadConversations();
    setConversations(loaded);
    setActiveId(loaded[0]?.id ?? null);
    hydrated.current = true;
  }, []);

  // Persist whenever conversations change (after hydration).
  useEffect(() => {
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

  const sendMessage = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || streaming) return;

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

      // Route + stream the mock reply.
      const result = routeMockReply(text);
      const replyText = t(result.replyKey, result.values);
      const card: ChatCard | undefined = result.card;
      const targetId = convId as string;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming(true);

      streamReply(
        replyText,
        (chunk) =>
          patchLastMessage(targetId, (m) =>
            m.role === 'assistant' ? { ...m, content: m.content + chunk } : m
          ),
        controller.signal,
        { instant: !result.stream }
      )
        .then(() => {
          if (card) {
            patchLastMessage(targetId, (m) =>
              m.role === 'assistant' ? { ...m, card } : m
            );
          }
        })
        .finally(() => {
          // Drop a never-filled assistant bubble if the send was aborted early.
          if (controller.signal.aborted) {
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
          }
          setStreaming(false);
        });
    },
    [activeId, streaming, t, patchLastMessage]
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
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within a ChatProvider');
  return ctx;
}
