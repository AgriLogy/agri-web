import { Box, Text, useColorModeValue } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import type { Message } from './types';

// ── Typing bounce animation ────────────────────────────────────────────────
const typingBounce = keyframes`
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30%           { transform: translateY(-4px); opacity: 1; }
`;

// ── Slide-in animation ─────────────────────────────────────────────────────
const msgIn = keyframes`
  from { opacity: 0; transform: translateY(8px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)   scale(1);    }
`;

interface AgrilogyMessageBubbleProps {
  message: Message;
  isTyping?: boolean;
}

export const AgrilogyMessageBubble = ({
  message,
  isTyping = false,
}: AgrilogyMessageBubbleProps) => {
  const isUser = message.role === 'user';

  // ── Light / dark tokens ──────────────────────────────────────────────────
  const userBubbleBg = useColorModeValue('green.50', 'green.900');
  const userBubbleColor = useColorModeValue('green.800', 'green.200');
  const userBubbleBorder = useColorModeValue('green.200', 'green.700');

  const asstBubbleBg = useColorModeValue('gray.100', 'gray.700');
  const asstBubbleColor = useColorModeValue('gray.800', 'gray.100');
  const asstBubbleBorder = useColorModeValue('gray.200', 'gray.600');

  const errorBubbleBg = useColorModeValue('red.50', 'red.900');
  const errorBubbleColor = useColorModeValue('red.700', 'red.200');
  const errorBubbleBorder = useColorModeValue('red.200', 'red.700');

  const timestampColor = useColorModeValue('gray.400', 'gray.500');
  const dotColor = useColorModeValue('gray.400', 'gray.500');

  // ── Bubble style resolution ──────────────────────────────────────────────
  const bubbleBg = message.isError
    ? errorBubbleBg
    : isUser
      ? userBubbleBg
      : asstBubbleBg;
  const bubbleColor = message.isError
    ? errorBubbleColor
    : isUser
      ? userBubbleColor
      : asstBubbleColor;
  const bubbleBorder = message.isError
    ? errorBubbleBorder
    : isUser
      ? userBubbleBorder
      : asstBubbleBorder;

  const borderRadius = isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px';

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems={isUser ? 'flex-end' : 'flex-start'}
      gap="3px"
      animation={`${msgIn} 0.2s cubic-bezier(0.34,1.4,0.64,1)`}
    >
      {/* Bubble */}
      <Box
        maxW="78%"
        px="13px"
        py="9px"
        bg={bubbleBg}
        color={bubbleColor}
        border="1px solid"
        borderColor={bubbleBorder}
        borderRadius={borderRadius}
        fontSize="13.5px"
        lineHeight="1.55"
        wordBreak="break-word"
        whiteSpace="pre-wrap"
      >
        {isTyping ? (
          /* Typing indicator */
          <Box display="flex" alignItems="center" gap="4px" py="2px">
            {[0, 0.2, 0.4].map((delay, i) => (
              <Box
                key={i}
                as="span"
                display="block"
                w="5px"
                h="5px"
                borderRadius="50%"
                bg={dotColor}
                animation={`${typingBounce} 1.2s ease-in-out ${delay}s infinite`}
              />
            ))}
          </Box>
        ) : (
          message.content
        )}
      </Box>

      {/* Timestamp */}
      <Text fontSize="10px" color={timestampColor} fontFamily="mono" px="4px">
        {message.timestamp.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </Box>
  );
};
