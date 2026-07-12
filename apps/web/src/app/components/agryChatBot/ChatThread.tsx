'use client';
import { KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Box,
  Flex,
  Text,
  Textarea,
  Tooltip,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { AgrilogyMessageBubble } from './MessageBubble';
import { SitemapCard } from './SitemapCard';
import { DataCard } from './DataCard';
import { useChat } from './ChatContext';
import {
  localeToRecognitionLang,
  useSpeechRecognition,
} from '../../hooks/useSpeechRecognition';

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

const MicIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 15a3 3 0 003-3V6a3 3 0 00-6 0v6a3 3 0 003 3z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19 10v2a7 7 0 01-14 0v-2M12 19v3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const StopIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
  </svg>
);

/** Pulsing halo shown while the mic is actively listening. */
const micPulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(229, 62, 62, 0.5); }
  70% { box-shadow: 0 0 0 8px rgba(229, 62, 62, 0); }
  100% { box-shadow: 0 0 0 0 rgba(229, 62, 62, 0); }
`;

interface ChatThreadProps {
  /** Called when a sitemap link is followed (e.g. to close the slide-out). */
  onNavigate?: () => void;
  /** Focus the input on mount (slide-out opens). */
  autoFocus?: boolean;
}

/**
 * The conversation surface: welcome state, message bubbles (+ sitemap cards),
 * typing indicator, and the input. Reads/writes the shared chat context, so it
 * behaves identically on the /chat page and in the global slide-out.
 */
export const ChatThread = ({ onNavigate, autoFocus }: ChatThreadProps) => {
  const t = useTranslations();
  const locale = useLocale();
  const toast = useToast();
  const timeTag = locale === 'ar' ? 'ar' : locale === 'en' ? 'en-GB' : 'fr-FR';
  const { activeConversation, streaming, sendMessage, stop } = useChat();

  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Snapshot of the composer text when dictation starts; recognized speech is
  // appended to it so voice input never clobbers text already typed.
  const voiceBaseRef = useRef('');

  const handleVoiceResult = useCallback(
    (transcript: string, _isFinal: boolean) => {
      const base = voiceBaseRef.current;
      setInput(
        base && transcript ? `${base} ${transcript}` : base + transcript
      );
    },
    []
  );

  const handleVoiceError = useCallback(
    (error: string) => {
      const key =
        error === 'not-allowed' || error === 'service-not-allowed'
          ? 'permissionDenied'
          : 'genericError';
      toast({
        description: t(`misc.chatbot.voice.${key}`),
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    },
    [t, toast]
  );

  const {
    supported: voiceSupported,
    listening,
    start: startVoice,
    stop: stopVoice,
  } = useSpeechRecognition({
    lang: localeToRecognitionLang(locale),
    onResult: handleVoiceResult,
    onError: handleVoiceError,
  });

  const toggleVoice = () => {
    if (listening) {
      stopVoice();
      return;
    }
    voiceBaseRef.current = input.trim();
    startVoice();
  };

  const messages = activeConversation?.messages ?? [];
  const isTypingIndicator =
    streaming && messages[messages.length - 1]?.content === '';

  const panelBg = useColorModeValue('white', 'gray.800');
  const headerBg = useColorModeValue('gray.50', 'gray.700');
  const panelBorder = useColorModeValue('gray.200', 'gray.600');
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
  const micBg = useColorModeValue('gray.100', 'gray.600');
  const micColor = useColorModeValue('gray.600', 'gray.200');
  const micHoverBg = useColorModeValue('gray.200', 'gray.500');
  const micActiveBg = useColorModeValue('red.500', 'red.500');
  const scrollThumb = useColorModeValue('gray.300', 'gray.600');
  const asstBubbleBg = useColorModeValue('gray.100', 'gray.700');
  const asstBubbleText = useColorModeValue('gray.800', 'gray.100');
  const asstBubbleBorder = useColorModeValue('gray.200', 'gray.600');
  const timestampColor = useColorModeValue('gray.400', 'gray.500');

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (autoFocus) setTimeout(() => textareaRef.current?.focus(), 200);
  }, [autoFocus]);

  const canSend = !!input.trim() && !streaming;

  const submit = () => {
    if (!canSend) return;
    if (listening) stopVoice();
    sendMessage(input);
    setInput('');
    const el = textareaRef.current;
    if (el) el.style.height = 'auto';
  };

  // Keep the textarea auto-sized when the value changes programmatically
  // (dictation updates `input` without firing the native `onInput` event).
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  return (
    <Flex direction="column" h="100%" minH={0} bg={panelBg}>
      {/* Messages */}
      <Box
        flex={1}
        minH={0}
        overflowY="auto"
        px="14px"
        pt="14px"
        pb="8px"
        display="flex"
        flexDirection="column"
        gap="8px"
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
        {/* Welcome (only on an empty thread) */}
        {messages.length === 0 && (
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
              {t('misc.chatbot.welcome')}
            </Box>
          </Box>
        )}

        {messages.map((msg, i) => {
          const isLast = i === messages.length - 1;
          const showTyping =
            isLast && isTypingIndicator && msg.role === 'assistant';

          if (msg.card) {
            return (
              <Box
                key={msg.id}
                display="flex"
                flexDirection="column"
                alignItems="flex-start"
              >
                {msg.content.trim() && (
                  <Text fontSize="13px" mb="6px" color={asstBubbleText}>
                    {msg.content}
                  </Text>
                )}
                <Box
                  maxW="92%"
                  px="13px"
                  py="10px"
                  bg={asstBubbleBg}
                  color={asstBubbleText}
                  border="1px solid"
                  borderColor={asstBubbleBorder}
                  borderRadius="12px 12px 12px 4px"
                >
                  {msg.card.type === 'sitemap' ? (
                    <SitemapCard onNavigate={onNavigate} />
                  ) : (
                    <DataCard card={msg.card} />
                  )}
                </Box>
                <Text
                  fontSize="10px"
                  color={timestampColor}
                  fontFamily="mono"
                  px="4px"
                  mt="3px"
                >
                  {msg.timestamp.toLocaleTimeString(timeTag, {
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
        <div ref={endRef} />
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
            maxH="120px"
            minH="38px"
            rows={1}
            lineHeight="1.45"
            placeholder={t('misc.chatbot.inputPlaceholder')}
            _placeholder={{ color: placeholderColor }}
            _focus={{ borderColor: inputFocus, boxShadow: 'none' }}
            _disabled={{ opacity: 0.5, cursor: 'not-allowed' }}
            disabled={streaming}
          />
          {voiceSupported && (
            <Tooltip
              label={
                listening
                  ? t('misc.chatbot.voice.stop')
                  : t('misc.chatbot.voice.start')
              }
              fontSize="11px"
              openDelay={300}
              hasArrow
            >
              <Box
                as="button"
                type="button"
                onClick={toggleVoice}
                w="36px"
                h="36px"
                borderRadius="10px"
                border="none"
                flexShrink={0}
                cursor={streaming ? 'not-allowed' : 'pointer'}
                bg={listening ? micActiveBg : micBg}
                color={listening ? 'white' : micColor}
                display="flex"
                alignItems="center"
                justifyContent="center"
                opacity={streaming ? 0.35 : 1}
                transition="background 0.15s, transform 0.15s"
                animation={listening ? `${micPulse} 1.4s infinite` : undefined}
                _hover={
                  streaming ? {} : { bg: listening ? micActiveBg : micHoverBg }
                }
                _active={streaming ? {} : { transform: 'scale(0.95)' }}
                disabled={streaming}
                aria-label={
                  listening
                    ? t('misc.chatbot.voice.stop')
                    : t('misc.chatbot.voice.start')
                }
                aria-pressed={listening}
              >
                {listening ? <StopIcon /> : <MicIcon />}
              </Box>
            </Tooltip>
          )}
          <Box
            as="button"
            type="button"
            onClick={submit}
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
              onClick={stop}
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
          ) : listening ? (
            <Flex align="center" gap="5px" color="red.400">
              <Box
                w="7px"
                h="7px"
                borderRadius="full"
                bg="red.400"
                animation={`${micPulse} 1.4s infinite`}
                flexShrink={0}
              />
              <Text fontSize="11px" fontFamily="mono">
                {t('misc.chatbot.voice.listening')}
              </Text>
            </Flex>
          ) : (
            <Text fontSize="10px" color={hintColor} fontFamily="mono" ml="auto">
              {t('misc.chatbot.inputHint')}
            </Text>
          )}
        </Flex>
      </Box>
    </Flex>
  );
};
