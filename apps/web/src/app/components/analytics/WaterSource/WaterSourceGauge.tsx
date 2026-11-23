import { keyframes } from '@emotion/react';
import { Box, Text, useColorModeValue } from '@chakra-ui/react';
import { formatNumber } from '@/app/utils/formatNumber';

const wave = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

/**
 * Water column visual: the fill height is the server's fill %, with the
 * critical / low / high thresholds marked on the wall. Animates between
 * levels so a simulator change is visible at once.
 */
const WaterSourceGauge = ({
  fillPercent,
  criticalPct,
  lowPct,
  highPct,
  scheme,
}: {
  fillPercent: number | null;
  criticalPct: number;
  lowPct: number;
  highPct: number;
  scheme: string;
}) => {
  const wall = useColorModeValue('gray.300', 'gray.600');
  const bg = useColorModeValue('gray.50', 'gray.800');
  const water = useColorModeValue(`${scheme}.400`, `${scheme}.500`);
  const waterTop = useColorModeValue(`${scheme}.300`, `${scheme}.400`);
  const label = useColorModeValue('gray.700', 'gray.100');
  const mark = useColorModeValue('gray.500', 'gray.400');
  const fill =
    fillPercent == null ? 0 : Math.min(100, Math.max(0, fillPercent));

  const marker = (pct: number, color: string) => (
    <Box
      position="absolute"
      left={0}
      right={0}
      bottom={`${pct}%`}
      borderTop="2px dashed"
      borderColor={color}
      opacity={0.8}
      zIndex={2}
    >
      <Text
        position="absolute"
        right={1}
        // Below the line near the top (where above would be clipped).
        top={pct > 80 ? '2px' : '-16px'}
        fontSize="2xs"
        color={mark}
        fontWeight="semibold"
      >
        {formatNumber(pct, 0)}%
      </Text>
    </Box>
  );

  return (
    <Box
      position="relative"
      w={{ base: '120px', md: '140px' }}
      h="220px"
      borderWidth="3px"
      borderTopWidth="0"
      borderColor={wall}
      borderBottomRadius="xl"
      bg={bg}
      overflow="hidden"
      flexShrink={0}
      role="img"
      aria-label={fillPercent == null ? '—' : `${formatNumber(fill, 1)}%`}
    >
      <Box
        position="absolute"
        left={0}
        right={0}
        bottom={0}
        h={`${fill}%`}
        bg={water}
        transition="height 0.8s ease"
      >
        {fill > 0 && (
          <Box
            position="absolute"
            top="-6px"
            left={0}
            w="200%"
            h="12px"
            bg={waterTop}
            borderRadius="50%"
            animation={`${wave} 4s linear infinite`}
            opacity={0.7}
          />
        )}
      </Box>
      {marker(criticalPct, 'red.400')}
      {marker(lowPct, 'orange.400')}
      {marker(highPct, 'purple.400')}
      <Text
        position="absolute"
        inset={0}
        display="flex"
        alignItems="center"
        justifyContent="center"
        fontSize="2xl"
        fontWeight="bold"
        color={label}
        zIndex={3}
        textShadow="0 1px 2px rgba(0,0,0,0.15)"
      >
        {fillPercent == null ? '—' : `${formatNumber(fill, 1)}%`}
      </Text>
    </Box>
  );
};

export default WaterSourceGauge;
