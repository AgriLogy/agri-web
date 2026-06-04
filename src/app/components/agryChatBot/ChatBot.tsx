'use client';
import { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Box, Flex, Textarea, Text, useColorModeValue } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { AgrilogyMessageBubble } from './MessageBubble';
import type { ChatErrorCode, Message } from './types';

// ── Icons ──────────────────────────────────────────────────────────────────
const LeafIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M21 3C21 3 13 3 8 8C3.58 12.42 4 18 4 18C4 18 9.58 18.42 14 14C19 9 19 1 19 1"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 20L9 15"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const CloseIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M18 6L6 18M6 6l12 12"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

const SendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path
      d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ── Animation ──────────────────────────────────────────────────────────────
const panelIn = keyframes`
  from { opacity: 0; transform: scale(0.88) translateY(10px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
`;

// ── App routes for /help ───────────────────────────────────────────────────
/** Stable route metadata; user-facing label/description resolved via i18n keys. */
const APP_ROUTES = [
  { path: '/', key: 'dashboard', icon: '🏠' },
  { path: '/soil', key: 'soil', icon: '🌱' },
  { path: '/station', key: 'station', icon: '🌤️' },
  { path: '/plant', key: 'plant', icon: '🌿' },
  { path: '/water', key: 'water', icon: '💧' },
  { path: '/alerts', key: 'alerts', icon: '🔔' },
];

// ── Help card component ────────────────────────────────────────────────────
interface HelpCardProps {
  linkColor: string;
  linkHoverColor: string;
  cardBg: string;
  cardBorder: string;
  descColor: string;
}

const HelpCard = ({
  linkColor,
  linkHoverColor,
  cardBg,
  cardBorder,
  descColor,
}: HelpCardProps) => {
  const t = useTranslations();
  return (
    <Box display="flex" flexDirection="column" gap="6px">
      <Text fontSize="13px" fontWeight={600} mb="4px">
        {t('misc.chatbot.availablePagesTitle')}
      </Text>
      {APP_ROUTES.map((route) => (
        <Box
          key={route.path}
          as="a"
          href={route.path}
          display="block"
          px="10px"
          py="7px"
          bg={cardBg}
          border="1px solid"
          borderColor={cardBorder}
          borderRadius="8px"
          textDecoration="none"
          transition="all 0.15s"
          _hover={{ borderColor: linkHoverColor, transform: 'translateX(2px)' }}
          role="link"
        >
          <Flex align="center" gap="6px" mb="1px">
            <Text fontSize="13px">{route.icon}</Text>
            <Text
              fontSize="12.5px"
              fontWeight={600}
              color={linkColor}
              fontFamily="mono"
            >
              {route.path}
            </Text>
            <Text fontSize="12px" fontWeight={500} color={linkColor}>
              — {t(`misc.chatbot.route.${route.key}.label`)}
            </Text>
          </Flex>
          <Text fontSize="11px" color={descColor} pl="20px">
            {t(`misc.chatbot.route.${route.key}.description`)}
          </Text>
        </Box>
      ))}
    </Box>
  );
};

// ── Props ──────────────────────────────────────────────────────────────────
interface AgrilogyChatBotProps {
  open: boolean;
  onClose: () => void;
  pageContext?: string;
}

// ── Direct Anthropic API call ─────────────────────────────────────────────
async function sendToAnthropic(
  messages: { role: string; content: string }[],
  system: string,
  onChunk: (text: string) => void,
  signal: AbortSignal
): Promise<void> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      stream: true,
      system,
      messages,
    }),
    signal,
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 429)
      throw Object.assign(new Error(), { code: 'rate_limit' });
    if (status === 503)
      throw Object.assign(new Error(), { code: 'overloaded' });
    if (status >= 500) throw Object.assign(new Error(), { code: 'internal' });
    throw Object.assign(new Error(), { code: 'network' });
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    if (signal.aborted) break;
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith(':') || !line.startsWith('data:')) continue;
      const jsonStr = line.slice(5).trim();
      if (jsonStr === '[DONE]') return;
      try {
        const event = JSON.parse(jsonStr);
        if (
          event.type === 'content_block_delta' &&
          event.delta?.type === 'text_delta' &&
          typeof event.delta.text === 'string'
        ) {
          onChunk(event.delta.text);
        }
      } catch {
        // skip malformed chunks
      }
    }
  }
}

// ── Component ──────────────────────────────────────────────────────────────
export const AgrilogyChatBot = ({
  open,
  onClose,
  pageContext = 'general',
}: AgrilogyChatBotProps) => {
  const t = useTranslations();

  // ── Localized strings ──────────────────────────────────────────────────────
  const WELCOME_MESSAGE = t('misc.chatbot.welcome');
  const SYSTEM_PROMPT = t('misc.chatbot.systemPrompt');
  const ERROR_MESSAGES: Record<ChatErrorCode, string> = {
    timeout: t('misc.chatbot.error.timeout'),
    overloaded: t('misc.chatbot.error.overloaded'),
    rate_limit: t('misc.chatbot.error.rateLimit'),
    internal: t('misc.chatbot.error.internal'),
    network: t('misc.chatbot.error.network'),
  };

  // ── State ────────────────────────────────────────────────────────────────
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Colors ───────────────────────────────────────────────────────────────
  const panelBg = useColorModeValue('white', 'gray.800');
  const panelBorder = useColorModeValue('gray.200', 'gray.600');
  const headerBg = useColorModeValue('gray.50', 'gray.700');
  const headerName = useColorModeValue('gray.800', 'gray.100');
  const headerStatus = useColorModeValue('gray.500', 'gray.400');
  const statusDot = useColorModeValue('green.500', 'green.400');
  const closeHoverBg = useColorModeValue('gray.200', 'gray.600');
  const toggleBg = useColorModeValue('green.600', 'green.500');
  const inputBg = useColorModeValue('gray.50', 'gray.700');
  const inputBorder = useColorModeValue('gray.200', 'gray.600');
  const inputFocus = useColorModeValue('green.500', 'green.400');
  const inputColor = useColorModeValue('gray.800', 'gray.100');
  const placeholderColor = useColorModeValue('gray.400', 'gray.500');
  const sendBg = useColorModeValue('green.600', 'green.500');
  const sendHoverBg = useColorModeValue('green.700', 'green.400');
  const hintColor = useColorModeValue('gray.400', 'gray.500');
  const abortColor = useColorModeValue('gray.500', 'gray.400');
  const abortHoverColor = useColorModeValue('red.500', 'red.400');
  const scrollThumb = useColorModeValue('gray.300', 'gray.600');
  const asstBubbleBg = useColorModeValue('gray.100', 'gray.700');
  const asstBubbleText = useColorModeValue('gray.800', 'gray.100');
  const asstBubbleBorder = useColorModeValue('gray.200', 'gray.600');
  const helpLinkColor = useColorModeValue('green.600', 'green.400');
  const helpLinkHover = useColorModeValue('green.700', 'green.300');
  const helpCardBg = useColorModeValue('gray.50', 'gray.700');
  const helpCardBorder = useColorModeValue('gray.200', 'gray.600');
  const helpDescColor = useColorModeValue('gray.500', 'gray.400');

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 200);
  }, [open]);

  // ── Message helpers ───────────────────────────────────────────────────────
  const appendMessage = (
    role: Message['role'],
    content: string,
    isError = false
  ) => {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role,
        content,
        isError,
        timestamp: new Date(),
      },
    ]);
  };

  const updateLastAssistant = (chunk: string) => {
    setMessages((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last?.role !== 'assistant') return prev;
      copy[copy.length - 1] = { ...last, content: last.content + chunk };
      return copy;
    });
  };

  const setLastMessageError = (code: ChatErrorCode) => {
    setMessages((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (!last) return prev;
      copy[copy.length - 1] = {
        ...last,
        content: ERROR_MESSAGES[code] ?? ERROR_MESSAGES.internal,
        isError: true,
      };
      return copy;
    });
  };

  const removeLastIfEmpty = () => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === 'assistant' && !last.content.trim())
        return prev.slice(0, -1);
      return prev;
    });
  };

  // ── /help command ─────────────────────────────────────────────────────────
  const handleHelpCommand = () => {
    appendMessage('user', '/help');
    // We append a special marker so the render knows to show the HelpCard
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '__HELP__',
        isError: false,
        timestamp: new Date(),
      },
    ]);
  };

  // ── Send ──────────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setInput('');

    // Handle /help command locally — no API call needed
    if (text.toLowerCase() === '/help') {
      handleHelpCommand();
      return;
    }

    const historySnapshot = messages
      .filter((m) => !m.isError && m.content.trim() && m.content !== '__HELP__')
      .map((m) => ({ role: m.role, content: m.content }));

    appendMessage('user', text);
    appendMessage('assistant', '');
    setStreaming(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await sendToAnthropic(
        [...historySnapshot, { role: 'user', content: text }],
        `${SYSTEM_PROMPT}\n${t('misc.chatbot.pageContext', { context: pageContext })}`,
        updateLastAssistant,
        controller.signal
      );
    } catch (e: unknown) {
      if ((e as Error).name === 'AbortError') {
        removeLastIfEmpty();
      } else {
        const code = (e as { code?: ChatErrorCode }).code ?? 'network';
        setLastMessageError(code);
      }
    } finally {
      setStreaming(false);
    }
  };

  const abort = () => abortRef.current?.abort();

  // ── Textarea ──────────────────────────────────────────────────────────────
  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    if (e.key === 'Escape') onClose();
  };

  const isTypingIndicator =
    streaming && messages[messages.length - 1]?.content === '';
  const canSend = !!input.trim() && !streaming;
  const timestampColor = useColorModeValue('gray.400', 'gray.500');

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box
      position="fixed"
      bottom={{ base: '80px', sm: '92px' }}
      right={{ base: '8px', sm: '28px' }}
      zIndex={999}
      w={{ base: 'calc(100vw - 16px)', sm: '380px' }}
      h={{ base: 'calc(100vh - 120px)', sm: '540px' }}
      borderRadius="16px"
      bg={panelBg}
      border="1px solid"
      borderColor={panelBorder}
      display="flex"
      flexDirection="column"
      overflow="hidden"
      boxShadow="0 8px 32px rgba(33,43,54,0.12), 0 2px 8px rgba(33,43,54,0.06)"
      transformOrigin="bottom right"
      transform={
        open ? 'scale(1) translateY(0)' : 'scale(0.88) translateY(10px)'
      }
      opacity={open ? 1 : 0}
      pointerEvents={open ? 'all' : 'none'}
      transition="transform 0.25s cubic-bezier(0.34,1.4,0.64,1), opacity 0.18s ease"
      animation={
        open ? `${panelIn} 0.25s cubic-bezier(0.34,1.4,0.64,1)` : undefined
      }
      role="dialog"
      aria-label={t('misc.chatbot.assistantName')}
    >
      {/* Header */}
      <Flex
        align="center"
        gap="10px"
        px="16px"
        py="14px"
        borderBottom="1px solid"
        borderColor={panelBorder}
        bg={headerBg}
        flexShrink={0}
      >
        <Flex
          w="32px"
          h="32px"
          borderRadius="10px"
          bg={toggleBg}
          color="white"
          align="center"
          justify="center"
          flexShrink={0}
        >
          <LeafIcon size={16} />
        </Flex>

        <Box flex={1} minW={0}>
          <Text
            fontSize="13px"
            fontWeight={600}
            color={headerName}
            letterSpacing="0.01em"
          >
            {t('misc.chatbot.assistantName')}
          </Text>
          <Flex align="center" gap="4px">
            <Box
              w="5px"
              h="5px"
              borderRadius="50%"
              bg={statusDot}
              flexShrink={0}
            />
            <Text fontSize="11px" color={headerStatus}>
              {streaming
                ? t('misc.chatbot.statusStreaming')
                : t('misc.chatbot.statusReady')}
            </Text>
          </Flex>
        </Box>

        <Box
          as="button"
          w="28px"
          h="28px"
          borderRadius="8px"
          border="none"
          cursor="pointer"
          bg="transparent"
          color={headerStatus}
          display="flex"
          alignItems="center"
          justifyContent="center"
          transition="background 0.15s, color 0.15s"
          _hover={{ bg: closeHoverBg, color: headerName }}
          onClick={onClose}
          aria-label={t('misc.chatbot.close')}
          type="button"
        >
          <CloseIcon size={14} />
        </Box>
      </Flex>

      {/* Messages */}
      <Box
        flex={1}
        overflowY="auto"
        px="14px"
        pt="14px"
        pb="8px"
        display="flex"
        flexDirection="column"
        gap="8px"
        bg={panelBg}
        sx={{
          scrollBehavior: 'smooth',
          '&::-webkit-scrollbar': { width: '3px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            background: scrollThumb,
            borderRadius: '99px',
          },
        }}
      >
        {/* Welcome */}
        <Box display="flex" flexDirection="column" alignItems="flex-start">
          <Box
            maxW="78%"
            px="13px"
            py="9px"
            bg={asstBubbleBg}
            color={asstBubbleText}
            border="1px solid"
            borderColor={asstBubbleBorder}
            borderRadius="12px 12px 12px 4px"
            fontSize="13.5px"
            lineHeight="1.55"
          >
            {WELCOME_MESSAGE}
          </Box>
        </Box>

        {messages.map((msg, i) => {
          const isLast = i === messages.length - 1;
          const showTyping =
            isLast && isTypingIndicator && msg.role === 'assistant';

          // Render help card inline for __HELP__ messages
          if (msg.content === '__HELP__') {
            return (
              <Box
                key={msg.id}
                display="flex"
                flexDirection="column"
                alignItems="flex-start"
              >
                <Box
                  maxW="90%"
                  px="13px"
                  py="10px"
                  bg={asstBubbleBg}
                  color={asstBubbleText}
                  border="1px solid"
                  borderColor={asstBubbleBorder}
                  borderRadius="12px 12px 12px 4px"
                  fontSize="13px"
                  lineHeight="1.55"
                >
                  <HelpCard
                    linkColor={helpLinkColor}
                    linkHoverColor={helpLinkHover}
                    cardBg={helpCardBg}
                    cardBorder={helpCardBorder}
                    descColor={helpDescColor}
                  />
                </Box>
                <Text
                  fontSize="10px"
                  color={timestampColor}
                  fontFamily="mono"
                  px="4px"
                  mt="3px"
                >
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </Box>
            );
          }

          return (
            <AgrilogyMessageBubble
              key={msg.id}
              message={msg}
              isTyping={showTyping}
            />
          );
        })}

        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Box
        px="12px"
        pt="10px"
        pb="12px"
        borderTop="1px solid"
        borderColor={panelBorder}
        bg={headerBg}
        flexShrink={0}
        display="flex"
        flexDirection="column"
        gap="6px"
      >
        <Flex align="flex-end" gap="8px">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            flex={1}
            bg={inputBg}
            border="1px solid"
            borderColor={inputBorder}
            borderRadius="10px"
            px="12px"
            py="9px"
            fontSize="13px"
            color={inputColor}
            resize="none"
            outline="none"
            maxH="100px"
            minH="38px"
            rows={1}
            lineHeight="1.45"
            placeholder={t('misc.chatbot.inputPlaceholder')}
            _placeholder={{ color: placeholderColor }}
            _focus={{ borderColor: inputFocus, boxShadow: 'none' }}
            _disabled={{ opacity: 0.5, cursor: 'not-allowed' }}
            disabled={streaming}
          />
          <Box
            as="button"
            type="button"
            onClick={sendMessage}
            w="36px"
            h="36px"
            borderRadius="10px"
            border="none"
            cursor={canSend ? 'pointer' : 'not-allowed'}
            flexShrink={0}
            bg={sendBg}
            color="white"
            display="flex"
            alignItems="center"
            justifyContent="center"
            opacity={canSend ? 1 : 0.35}
            transition="background 0.15s, transform 0.15s"
            _hover={
              canSend ? { bg: sendHoverBg, transform: 'scale(1.05)' } : {}
            }
            _active={canSend ? { transform: 'scale(0.95)' } : {}}
            disabled={!canSend}
            aria-label={t('misc.chatbot.send')}
          >
            <SendIcon />
          </Box>
        </Flex>

        <Flex justify="space-between" align="center" minH="16px">
          {streaming ? (
            <Box
              as="button"
              type="button"
              onClick={abort}
              fontSize="11px"
              fontFamily="mono"
              color={abortColor}
              bg="transparent"
              border="none"
              cursor="pointer"
              p={0}
              transition="color 0.15s"
              _hover={{ color: abortHoverColor }}
            >
              {t('misc.chatbot.stopGeneration')}
            </Box>
          ) : (
            <Text fontSize="10px" color={hintColor} fontFamily="mono" ml="auto">
              {t('misc.chatbot.inputHint')}
            </Text>
          )}
        </Flex>
      </Box>
    </Box>
  );
};
