'use client';

import { Box, useColorModeValue } from '@chakra-ui/react';

export interface ValveSchematicProps {
  active: boolean;
  label?: string;
  compact?: boolean;
  showTopRun?: boolean;
  showBottomDrop?: boolean;
}

/**
 * Schematic valve like the irrigation demo: vertical green capsule when open,
 * crossed “X” mark when closed.
 */
const ValveSchematic = ({
  active,
  label,
  compact = false,
  showTopRun = true,
  showBottomDrop = true,
}: ValveSchematicProps) => {
  const lineStroke = useColorModeValue('#0f172a', '#e2e8f0');
  const pipeBorder = useColorModeValue('whiteAlpha.700', 'whiteAlpha.200');
  const pipeGradient = useColorModeValue(
    'linear(to-b, #bae6fd, #38bdf8)',
    'linear(to-b, #0369a1, #0ea5e9)'
  );
  const w = compact ? 40 : 56;
  const glyphMinH = compact ? '48px' : '72px';
  const topH = compact ? '6px' : '8px';
  const bottomH = compact ? '12px' : '16px';
  const bottomW = compact ? '6px' : '8px';

  return (
    <Box position="relative" textAlign="center">
      {showTopRun && (
        <Box
          mx="auto"
          w="70%"
          maxW={compact ? '80px' : '120px'}
          h={topH}
          bgGradient={pipeGradient}
          borderRadius="full"
          borderWidth="1px"
          borderColor={pipeBorder}
          mb={compact ? 1 : 2}
        />
      )}
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minH={glyphMinH}
      >
        <svg
          width={w}
          height={compact ? 46 : 64}
          viewBox="0 0 56 64"
          aria-hidden
        >
          {active ? (
            <rect
              x="18"
              y="4"
              width="20"
              height="56"
              rx="10"
              ry="10"
              fill="#10b981"
              stroke={lineStroke}
              strokeWidth="2"
            />
          ) : (
            <g
              stroke={lineStroke}
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            >
              <path d="M 14 18 L 42 46" />
              <path d="M 42 18 L 14 46" />
            </g>
          )}
        </svg>
      </Box>
      {showBottomDrop && (
        <Box
          mx="auto"
          w={bottomW}
          flex={1}
          minH={bottomH}
          bgGradient={pipeGradient}
          borderRadius="full"
          borderWidth="1px"
          borderColor={pipeBorder}
          mt={1}
        />
      )}
      {label != null && label !== '' && (
        <Box
          as="span"
          display="block"
          mt={compact ? 1 : 2}
          fontSize={compact ? 'xs' : 'sm'}
          fontWeight="bold"
          color="inherit"
        >
          {label}
        </Box>
      )}
    </Box>
  );
};

export default ValveSchematic;
