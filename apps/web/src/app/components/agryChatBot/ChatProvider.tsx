'use client';
import React, { useEffect, useState } from 'react';
import { Box } from '@chakra-ui/react';
import { usePathname } from 'next/navigation';
import { AgrilogyChatBot } from './ChatBot';

const LOGIN_PATHS = new Set(['/login', '/admin/login']);

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

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const hideChat = pathname != null && LOGIN_PATHS.has(pathname);

  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (hideChat) setChatOpen(false);
  }, [hideChat]);

  return (
    <>
      {children}

      {hideChat ? null : (
        <>
          {/* Floating chat toggle */}
          <Box
            as="button"
            position="fixed"
            bottom="28px"
            right="28px"
            zIndex={1000}
            w="52px"
            h="52px"
            borderRadius="14px"
            border="none"
            cursor="pointer"
            bg={chatOpen ? 'green.700' : 'green.600'}
            color="white"
            boxShadow="0 4px 16px rgba(56,161,105,0.35)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            transition="transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease, background 0.15s"
            _hover={{
              transform: 'scale(1.08)',
              boxShadow: '0 6px 24px rgba(56,161,105,0.45)',
            }}
            _active={{ transform: 'scale(0.96)' }}
            onClick={() => setChatOpen((v) => !v)}
            aria-label={
              chatOpen ? 'Close assistant' : 'Open Agrilogy assistant'
            }
            type="button"
          >
            <Box
              as="span"
              position="absolute"
              display="flex"
              alignItems="center"
              justifyContent="center"
              transition="opacity 0.15s ease, transform 0.2s cubic-bezier(0.34,1.56,0.64,1)"
              opacity={chatOpen ? 0 : 1}
              transform={
                chatOpen ? 'rotate(45deg) scale(0.7)' : 'rotate(0deg) scale(1)'
              }
            >
              <LeafIcon size={22} />
            </Box>

            <Box
              as="span"
              position="absolute"
              display="flex"
              alignItems="center"
              justifyContent="center"
              transition="opacity 0.15s ease, transform 0.2s cubic-bezier(0.34,1.56,0.64,1)"
              opacity={chatOpen ? 1 : 0}
              transform={
                chatOpen ? 'rotate(0deg) scale(1)' : 'rotate(-45deg) scale(0.7)'
              }
            >
              <CloseIcon size={18} />
            </Box>

            {!chatOpen && (
              <Box
                as="span"
                position="absolute"
                top="-3px"
                right="-3px"
                w="10px"
                h="10px"
                borderRadius="50%"
                bg="red.500"
                border="2px solid white"
              />
            )}
          </Box>

          <AgrilogyChatBot
            open={chatOpen}
            onClose={() => setChatOpen(false)}
            pageContext="global"
          />
        </>
      )}
    </>
  );
};
