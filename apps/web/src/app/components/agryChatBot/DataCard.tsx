'use client';
import { Box, Flex, Text, useColorModeValue } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import type { ChatCard } from './types';

/**
 * Renders a per-intent data card built from the assistant backend's tool
 * result (metrics / alerts / notifications / error). The `sitemap` card has
 * its own component; this covers the rest. Pure presentation — the shape is
 * normalised in `chatMap.dataCardFor`.
 */
export const DataCard = ({ card }: { card: ChatCard }) => {
  const t = useTranslations();
  const rowBg = useColorModeValue('gray.50', 'gray.700');
  const rowBorder = useColorModeValue('gray.200', 'gray.600');
  const muted = useColorModeValue('gray.500', 'gray.400');
  const warn = useColorModeValue('orange.500', 'orange.300');
  const ok = useColorModeValue('green.600', 'green.300');

  const empty = (
    <Text fontSize="12px" color={muted}>
      {t('misc.chatbot.dataCard.empty')}
    </Text>
  );

  const row = (key: string, children: React.ReactNode) => (
    <Box
      key={key}
      px="10px"
      py="7px"
      bg={rowBg}
      border="1px solid"
      borderColor={rowBorder}
      borderRadius="8px"
    >
      {children}
    </Box>
  );

  if (card.type === 'metrics') {
    if (card.items.length === 0) return empty;
    return (
      <Box display="flex" flexDirection="column" gap="6px" w="100%">
        {card.items.map((m, i) =>
          row(
            `${m.label}-${i}`,
            <Flex justify="space-between" gap="10px">
              <Text fontSize="13px">{m.label}</Text>
              <Text fontSize="13px" fontWeight={600}>
                {m.value === null || m.value === '' ? '—' : m.value}
                {m.unit ? ` ${m.unit}` : ''}
              </Text>
            </Flex>
          )
        )}
      </Box>
    );
  }

  if (card.type === 'alerts') {
    if (card.items.length === 0) return empty;
    return (
      <Box display="flex" flexDirection="column" gap="6px" w="100%">
        {card.items.map((a, i) =>
          row(
            `${a.name}-${i}`,
            <Box>
              <Flex justify="space-between" gap="10px" align="center">
                <Text fontSize="13px" fontWeight={600}>
                  {a.name}
                </Text>
                <Text
                  fontSize="11px"
                  fontWeight={600}
                  color={a.severity === 'warning' ? warn : ok}
                >
                  {a.severity === 'warning' ? '●' : '○'}
                </Text>
              </Flex>
              <Text fontSize="11px" color={muted}>
                {[
                  a.condition && a.threshold != null
                    ? `${a.condition} ${a.threshold}`
                    : null,
                  a.zone,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </Box>
          )
        )}
      </Box>
    );
  }

  if (card.type === 'notifications') {
    if (card.items.length === 0) return empty;
    return (
      <Box display="flex" flexDirection="column" gap="6px" w="100%">
        {card.items.map((n, i) =>
          row(
            `${n.title}-${i}`,
            <Box>
              <Text fontSize="13px" fontWeight={600}>
                {n.title}
              </Text>
              {n.message && (
                <Text fontSize="11px" color={muted}>
                  {n.message}
                </Text>
              )}
            </Box>
          )
        )}
      </Box>
    );
  }

  if (card.type === 'error') {
    return (
      <Text fontSize="12px" color={warn}>
        {card.message}
      </Text>
    );
  }

  return null;
};
