'use client';

/**
 * What sits under an AI answer (agri-api#472):
 *
 * - **Data used**: the readings the advice was based on, each with its time,
 *   flagged when older than 2 days, so a farmer can see what the answer rests
 *   on and how fresh it is;
 * - **Action to confirm**: an action the assistant proposed (create an alert,
 *   change notification frequency). Nothing happens until the farmer presses
 *   Confirm; the server never runs a write from the chat itself.
 */

import { useState } from 'react';
import {
  Box,
  Button,
  Collapse,
  Flex,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import { useLocale, useTranslations } from 'next-intl';

import { useChat } from './ChatContext';
import { readingAge } from './chatMap';
import type { ChatPendingAction, ChatSource, Message } from './types';

const formatAge = (
  t: ReturnType<typeof useTranslations>,
  hours: number
): string => {
  if (hours < 1) return t('misc.chatbot.sources.justNow');
  if (hours < 48)
    return t('misc.chatbot.sources.hoursAgo', { n: Math.round(hours) });
  return t('misc.chatbot.sources.daysAgo', { n: Math.round(hours / 24) });
};

const SourcesList = ({ sources }: { sources: ChatSource[] }) => {
  const t = useTranslations();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const muted = useColorModeValue('gray.500', 'gray.400');
  const stale = useColorModeValue('orange.600', 'orange.300');
  const border = useColorModeValue('gray.200', 'gray.600');
  const items = sources.flatMap((s) =>
    s.items.length
      ? s.items.map((i) => ({ ...i, tool: s.tool }))
      : [{ label: '', value: null, unit: '', asOf: s.asOf, tool: s.tool }]
  );
  const anyStale = items.some((i) => readingAge(i.asOf)?.stale);
  const toolLabel = (tool: string) =>
    t.has(`misc.chatbot.tools.${tool}`)
      ? t(`misc.chatbot.tools.${tool}`)
      : tool;

  return (
    <Box mt="4px" maxW="92%">
      <Button
        size="xs"
        variant="link"
        color={anyStale ? stale : muted}
        fontWeight={500}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {t('misc.chatbot.sources.title', { n: items.length })}
        {anyStale ? ` · ${t('misc.chatbot.sources.someStale')}` : ''}
      </Button>
      <Collapse in={open} animateOpacity>
        <Box
          mt="4px"
          border="1px solid"
          borderColor={border}
          borderRadius="8px"
          px="10px"
          py="6px"
        >
          {items.map((i, idx) => {
            const age = readingAge(i.asOf);
            return (
              <Flex
                key={`${i.tool}-${idx}`}
                justify="space-between"
                gap="10px"
                fontSize="11.5px"
                py="2px"
              >
                <Text noOfLines={1}>
                  {i.label || toolLabel(i.tool)}
                  {i.value !== null ? (
                    <Text as="span" fontWeight={600}>
                      {' '}
                      {i.value}
                      {i.unit ? ` ${i.unit}` : ''}
                    </Text>
                  ) : null}
                </Text>
                <Text
                  flexShrink={0}
                  color={age?.stale ? stale : muted}
                  title={
                    i.asOf ? new Date(i.asOf).toLocaleString(locale) : undefined
                  }
                >
                  {age
                    ? formatAge(t, age.hours)
                    : t('misc.chatbot.sources.noData')}
                </Text>
              </Flex>
            );
          })}
        </Box>
      </Collapse>
    </Box>
  );
};

const describeAction = (
  t: ReturnType<typeof useTranslations>,
  action: ChatPendingAction
): string => {
  const p = action.params;
  if (action.tool === 'create_alert') {
    const key = String(p.sensor_key ?? '');
    // Tool keys are camelCase (soilMoistureMedium); labels are snake_case.
    const snake = key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
    const sensor = t.has(`sensors.${snake}`)
      ? t(`sensors.${snake}`)
      : t.has(`sensors.${key}`)
        ? t(`sensors.${key}`)
        : key;
    return t('misc.chatbot.action.createAlert', {
      name: String(p.name ?? ''),
      sensor,
      condition: String(p.condition ?? ''),
      value: String(p.condition_nbr ?? ''),
    });
  }
  if (action.tool === 'set_notification_cadence') {
    return t('misc.chatbot.action.setCadence', {
      minutes: String(p.minutes ?? ''),
    });
  }
  return t('misc.chatbot.action.generic', { tool: action.tool });
};

const ActionCard = ({
  messageId,
  action,
}: {
  messageId: string;
  action: ChatPendingAction;
}) => {
  const t = useTranslations();
  const { confirmAction, dismissAction } = useChat();
  const bg = useColorModeValue('yellow.50', 'yellow.900');
  const border = useColorModeValue('yellow.300', 'yellow.600');
  const okColor = useColorModeValue('green.600', 'green.300');
  const errColor = useColorModeValue('red.600', 'red.300');
  const muted = useColorModeValue('gray.500', 'gray.400');

  return (
    <Box
      mt="6px"
      maxW="92%"
      bg={bg}
      border="1px solid"
      borderColor={border}
      borderRadius="10px"
      px="12px"
      py="9px"
      role="group"
      aria-label={t('misc.chatbot.action.title')}
    >
      <Text fontSize="11px" fontWeight={700} textTransform="uppercase" mb="3px">
        {t('misc.chatbot.action.title')}
      </Text>
      <Text fontSize="13px" mb="8px" dir="auto">
        {describeAction(t, action)}
      </Text>
      {action.state === 'proposed' || action.state === 'running' ? (
        <Flex gap="8px">
          <Button
            size="xs"
            colorScheme="green"
            isLoading={action.state === 'running'}
            onClick={() => confirmAction(messageId)}
          >
            {t('misc.chatbot.action.confirm')}
          </Button>
          <Button
            size="xs"
            variant="ghost"
            isDisabled={action.state === 'running'}
            onClick={() => dismissAction(messageId)}
          >
            {t('misc.chatbot.action.cancel')}
          </Button>
        </Flex>
      ) : (
        <Text
          fontSize="12px"
          fontWeight={600}
          color={
            action.state === 'confirmed'
              ? okColor
              : action.state === 'failed'
                ? errColor
                : muted
          }
        >
          {t(`misc.chatbot.action.${action.state}`)}
          {action.error ? ` : ${action.error}` : ''}
        </Text>
      )}
    </Box>
  );
};

export const MessageExtras = ({ message }: { message: Message }) => {
  if (message.role !== 'assistant') return null;
  const hasSources = !!message.sources?.length;
  if (!hasSources && !message.pendingAction) return null;
  return (
    <Box display="flex" flexDirection="column" alignItems="flex-start">
      {message.pendingAction ? (
        <ActionCard messageId={message.id} action={message.pendingAction} />
      ) : null}
      {hasSources ? <SourcesList sources={message.sources!} /> : null}
    </Box>
  );
};
