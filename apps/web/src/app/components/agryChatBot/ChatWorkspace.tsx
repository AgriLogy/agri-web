'use client';
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Box, Flex, Text, useColorModeValue } from '@chakra-ui/react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { ChatThread } from './ChatThread';
import { useChat } from './ChatContext';
import type { Conversation } from './types';

const PlusIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const TrashIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a1 1 0 01-1 1H6a1 1 0 01-1-1V6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** History list — new-chat button + selectable, deletable conversations. */
const HistoryList = ({ onPick }: { onPick?: () => void }) => {
  const t = useTranslations();
  const locale = useLocale();
  const dateTag = locale === 'ar' ? 'ar' : locale === 'en' ? 'en-GB' : 'fr-FR';
  const {
    conversations,
    activeId,
    newConversation,
    selectConversation,
    deleteConversation,
  } = useChat();

  const brand = useColorModeValue('green.600', 'green.500');
  const brandHover = useColorModeValue('green.700', 'green.400');
  const itemBg = useColorModeValue('transparent', 'transparent');
  const itemHoverBg = useColorModeValue('gray.100', 'gray.700');
  const activeBg = useColorModeValue('green.50', 'green.900');
  const activeBorder = useColorModeValue('green.300', 'green.600');
  const titleColor = useColorModeValue('gray.800', 'gray.100');
  const metaColor = useColorModeValue('gray.500', 'gray.400');
  const delColor = useColorModeValue('gray.400', 'gray.500');
  const delHover = useColorModeValue('red.500', 'red.400');
  const emptyColor = useColorModeValue('gray.400', 'gray.500');

  return (
    <Flex direction="column" h="100%" minH={0}>
      <Box
        as="button"
        type="button"
        onClick={() => {
          newConversation();
          onPick?.();
        }}
        m="10px"
        px="12px"
        py="10px"
        borderRadius="10px"
        border="none"
        cursor="pointer"
        bg={brand}
        color="white"
        fontSize="13px"
        fontWeight={600}
        display="flex"
        alignItems="center"
        justifyContent="center"
        gap="6px"
        transition="background 0.15s"
        _hover={{ bg: brandHover }}
        flexShrink={0}
      >
        <PlusIcon /> {t('misc.chatbot.newChat')}
      </Box>

      <Box flex={1} minH={0} overflowY="auto" px="8px" pb="8px">
        {conversations.length === 0 ? (
          <Text fontSize="12px" color={emptyColor} textAlign="center" mt="20px" px="10px">
            {t('misc.chatbot.history.empty')}
          </Text>
        ) : (
          conversations.map((c: Conversation) => {
            const isActive = c.id === activeId;
            return (
              <Flex
                key={c.id}
                role="button"
                tabIndex={0}
                align="center"
                gap="6px"
                px="10px"
                py="9px"
                mb="4px"
                borderRadius="9px"
                cursor="pointer"
                bg={isActive ? activeBg : itemBg}
                border="1px solid"
                borderColor={isActive ? activeBorder : 'transparent'}
                transition="background 0.12s"
                _hover={{ bg: isActive ? activeBg : itemHoverBg }}
                onClick={() => {
                  selectConversation(c.id);
                  onPick?.();
                }}
              >
                <Box flex={1} minW={0}>
                  <Text
                    fontSize="13px"
                    fontWeight={500}
                    color={titleColor}
                    noOfLines={1}
                  >
                    {c.title}
                  </Text>
                  <Text fontSize="10.5px" color={metaColor} fontFamily="mono">
                    {c.updatedAt.toLocaleDateString(dateTag, {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </Text>
                </Box>
                <Box
                  as="button"
                  type="button"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    deleteConversation(c.id);
                  }}
                  w="24px"
                  h="24px"
                  borderRadius="6px"
                  border="none"
                  bg="transparent"
                  color={delColor}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  flexShrink={0}
                  cursor="pointer"
                  transition="color 0.15s"
                  _hover={{ color: delHover }}
                  aria-label={t('misc.chatbot.history.delete')}
                >
                  <TrashIcon />
                </Box>
              </Flex>
            );
          })
        )}
      </Box>
    </Flex>
  );
};

/** Full-page assistant: history sidebar + conversation thread. */
export const ChatWorkspace = () => {
  const t = useTranslations();
  const isMobile = useIsMobile();
  const [historyOpen, setHistoryOpen] = useState(false);

  const surface = useColorModeValue('white', 'gray.800');
  const border = useColorModeValue('gray.200', 'gray.600');
  const sidebarBg = useColorModeValue('gray.50', 'gray.900');
  const barColor = useColorModeValue('gray.600', 'gray.300');

  if (isMobile) {
    return (
      <Flex direction="column" h="100%" minH={0} bg={surface} position="relative">
        <Flex
          align="center"
          justify="space-between"
          px="12px"
          py="8px"
          borderBottom="1px solid"
          borderColor={border}
          flexShrink={0}
        >
          <Box
            as="button"
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            fontSize="13px"
            fontWeight={600}
            color={barColor}
            bg="transparent"
            border="none"
            cursor="pointer"
          >
            {historyOpen
              ? t('misc.chatbot.history.hide')
              : t('misc.chatbot.history.show')}
          </Box>
          <Text fontSize="13px" fontWeight={600} color={barColor}>
            {t('misc.chatbot.assistantName')}
          </Text>
        </Flex>
        {historyOpen ? (
          <Box flex={1} minH={0} bg={sidebarBg}>
            <HistoryList onPick={() => setHistoryOpen(false)} />
          </Box>
        ) : (
          <Box flex={1} minH={0}>
            <ChatThread autoFocus />
          </Box>
        )}
      </Flex>
    );
  }

  return (
    <Flex h="100%" minH={0} bg={surface}>
      <Box
        w="270px"
        flexShrink={0}
        borderRight="1px solid"
        borderColor={border}
        bg={sidebarBg}
      >
        <HistoryList />
      </Box>
      <Box flex={1} minW={0}>
        <ChatThread autoFocus />
      </Box>
    </Flex>
  );
};
