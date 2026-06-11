'use client';

import { Box, useColorModeValue } from '@chakra-ui/react';

export interface PumpSchematicProps {
  running: boolean;
  label?: string;
}

/** Simplified dosing / line pump: green when running, grey when off. */
const PumpSchematic = ({ running, label }: PumpSchematicProps) => {
  const idleFill = useColorModeValue('#94a3b8', '#64748b');
  const outline = useColorModeValue('#0f172a', '#e2e8f0');
  const pipeStroke = useColorModeValue('#38bdf8', '#22d3ee');
  const body = running ? '#10b981' : idleFill;

  return (
    <Box textAlign="center">
      <Box
        display="flex"
        justifyContent="center"
        minH="80px"
        alignItems="flex-end"
      >
        <svg width="64" height="84" viewBox="0 0 64 84" aria-hidden>
          <rect
            x="20"
            y="8"
            width="24"
            height="18"
            rx="4"
            fill={body}
            stroke={outline}
            strokeWidth="2"
          />
          <rect
            x="14"
            y="30"
            width="36"
            height="44"
            rx="6"
            fill={body}
            stroke={outline}
            strokeWidth="2"
          />
          <line
            x1="8"
            y1="52"
            x2="14"
            y2="52"
            stroke={pipeStroke}
            strokeWidth="6"
            strokeLinecap="round"
          />
          <line
            x1="50"
            y1="52"
            x2="58"
            y2="52"
            stroke={pipeStroke}
            strokeWidth="6"
            strokeLinecap="round"
          />
        </svg>
      </Box>
      {label != null && label !== '' && (
        <Box as="span" display="block" mt={1} fontSize="sm" fontWeight="bold">
          {label}
        </Box>
      )}
    </Box>
  );
};

export default PumpSchematic;
