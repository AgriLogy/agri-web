'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Box, Flex, Text, useColorModeValue } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { useTranslations } from 'next-intl';
import { ChatThread } from './ChatThread';
import { useChat } from './ChatContext';

const HIDDEN_PATHS = new Set(['/login']);
const CHAT_PAGE = '/chat';

const LeafIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M21 3C21 3 13 3 8 8C3.58 12.42 4 18 4 18C4 18 9.58 18.42 14 14C19 9 19 1 19 1"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M4 20L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const CloseIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M18 6L6 18M6 6l12 12"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

const ExpandIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M15 3h6v6M21 3l-7 7M9 21H3v-6M3 21l7-7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PlusIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M12 5v14M5 12h14"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

const panelIn = keyframes`
  from { transform: translateX(16px); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
`;

/**
 * Global right-edge slide-out assistant. A small tab is pinned to the right
 * edge on every page (except /login); clicking it slides out a chat panel that
 * shares history with the full /chat page. "Expand" jumps to the full page.
 */
export const ChatDock = () => {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const { newConversation, streaming } = useChat();
  const [open, setOpen] = useState(false);

  const hidden =
    (pathname != null && HIDDEN_PATHS.has(pathname)) || pathname === CHAT_PAGE;

  useEffect(() => {
    if (hidden) setOpen(false);
  }, [hidden]);

  const panelBg = useColorModeValue('white', 'gray.800');
  const panelBorder = useColorModeValue('gray.200', 'gray.600');
  const headerBg = useColorModeValue('gray.50', 'gray.700');
  const headerName = useColorModeValue('gray.800', 'gray.100');
  const headerStatus = useColorModeValue('gray.500', 'gray.400');
  const statusDot = useColorModeValue('green.500', 'green.400');
  const iconBtnColor = useColorModeValue('gray.500', 'gray.400');
  const iconBtnHoverBg = useColorModeValue('gray.200', 'gray.600');
  const brand = useColorModeValue('green.600', 'green.500');
  const brandHover = useColorModeValue('green.700', 'green.400');
  const tabColor = 'white';

  if (hidden) return null;

  return (
    <>
      {/* Right-edge tab (visible when closed) */}
      <Box
        as="button"
        type="button"
        onClick={() => setOpen(true)}
        position="fixed"
        right="0"
        top="42%"
        zIndex={1000}
        display={open ? 'none' : 'flex'}
        flexDirection="column"
        alignItems="center"
        gap="6px"
        w="34px"
        py="14px"
        border="none"
        cursor="pointer"
        bg={brand}
        color={tabColor}
        borderRadius="12px 0 0 12px"
        boxShadow="-2px 2px 12px rgba(33,43,54,0.18)"
        transition="background 0.15s, transform 0.15s, padding-right 0.15s"
        _hover={{ bg: brandHover, pr: '4px' }}
        aria-label={t('misc.chatbot.openAssistant')}
      >
        <LeafIcon size={18} />
        <Text
          fontSize="10px"
          fontWeight={700}
          letterSpacing="0.08em"
          style={{ writingMode: 'vertical-rl' }}
        >
          {t('misc.chatbot.tabLabel')}
        </Text>
        <Box w="7px" h="7px" borderRadius="50%" bg="red.400" />
      </Box>

      {/* Slide-out panel */}
      <Box
        position="fixed"
        top={{ base: '0', sm: '12px' }}
        right={{ base: '0', sm: '12px' }}
        bottom={{ base: '0', sm: '12px' }}
        zIndex={1001}
        w={{ base: '100vw', sm: '390px' }}
        bg={panelBg}
        border="1px solid"
        borderColor={panelBorder}
        borderRadius={{ base: '0', sm: '16px' }}
        boxShadow="0 8px 32px rgba(33,43,54,0.18)"
        display="flex"
        flexDirection="column"
        overflow="hidden"
        transform={open ? 'translateX(0)' : 'translateX(110%)'}
        opacity={open ? 1 : 0}
        pointerEvents={open ? 'all' : 'none'}
        transition="transform 0.28s cubic-bezier(0.34,1.4,0.64,1), opacity 0.2s ease"
        animation={open ? `${panelIn} 0.28s ease` : undefined}
        role="dialog"
        aria-label={t('misc.chatbot.assistantName')}
      >
        {/* Header */}
        <Flex
          align="center"
          gap="10px"
          px="14px"
          py="12px"
          borderBottom="1px solid"
          borderColor={panelBorder}
          bg={headerBg}
          flexShrink={0}
        >
          <Flex
            w="30px"
            h="30px"
            borderRadius="9px"
            bg={brand}
            color="white"
            align="center"
            justify="center"
            flexShrink={0}
          >
            <LeafIcon size={16} />
          </Flex>
          <Box flex={1} minW={0}>
            <Text fontSize="13px" fontWeight={600} color={headerName}>
              {t('misc.chatbot.assistantName')}
            </Text>
            <Flex align="center" gap="4px">
              <Box w="5px" h="5px" borderRadius="50%" bg={statusDot} />
              <Text fontSize="11px" color={headerStatus}>
                {streaming
                  ? t('misc.chatbot.statusStreaming')
                  : t('misc.chatbot.statusReady')}
              </Text>
            </Flex>
          </Box>

          <DockIconButton
            label={t('misc.chatbot.newChat')}
            color={iconBtnColor}
            hoverBg={iconBtnHoverBg}
            hoverColor={headerName}
            onClick={() => newConversation()}
          >
            <PlusIcon />
          </DockIconButton>
          <DockIconButton
            label={t('misc.chatbot.expand')}
            color={iconBtnColor}
            hoverBg={iconBtnHoverBg}
            hoverColor={headerName}
            onClick={() => {
              setOpen(false);
              router.push(CHAT_PAGE);
            }}
          >
            <ExpandIcon />
          </DockIconButton>
          <DockIconButton
            label={t('misc.chatbot.close')}
            color={iconBtnColor}
            hoverBg={iconBtnHoverBg}
            hoverColor={headerName}
            onClick={() => setOpen(false)}
          >
            <CloseIcon />
          </DockIconButton>
        </Flex>

        {/* Conversation */}
        <Box flex={1} minH={0}>
          <ChatThread autoFocus={open} onNavigate={() => setOpen(false)} />
        </Box>
      </Box>
    </>
  );
};

interface DockIconButtonProps {
  label: string;
  color: string;
  hoverBg: string;
  hoverColor: string;
  children: React.ReactNode;
  onClick?: () => void;
}

const DockIconButton = ({
  label,
  color,
  hoverBg,
  hoverColor,
  children,
  onClick,
}: DockIconButtonProps) => (
  <Box
    as="button"
    type="button"
    onClick={onClick}
    w="28px"
    h="28px"
    borderRadius="8px"
    border="none"
    cursor="pointer"
    bg="transparent"
    color={color}
    display="flex"
    alignItems="center"
    justifyContent="center"
    flexShrink={0}
    transition="background 0.15s, color 0.15s"
    _hover={{ bg: hoverBg, color: hoverColor }}
    aria-label={label}
  >
    {children}
  </Box>
);
