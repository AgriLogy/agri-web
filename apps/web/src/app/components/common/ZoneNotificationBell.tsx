'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Box, IconButton, Tooltip } from '@chakra-ui/react';
import { BellIcon } from '@chakra-ui/icons';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import { useNotificationBellCounts } from '@/app/hooks/useNotificationBellCounts';

type ZoneNotificationBellProps = {
  zoneId: number;
  zoneName: string;
};

const ZoneNotificationBell: React.FC<ZoneNotificationBellProps> = ({
  zoneId,
  zoneName,
}) => {
  const router = useRouter();
  const { hoverColor } = useColorModeStyles();
  const { unreadForZone } = useNotificationBellCounts();
  const count = unreadForZone(zoneId);

  const qs = new URLSearchParams({ zoneId: String(zoneId) });
  const href = `/notifications?${qs.toString()}`;

  return (
    <Tooltip
      label={
        count > 0
          ? `${count} notification(s) — ${zoneName}`
          : `Notifications — ${zoneName}`
      }
      hasArrow
      openDelay={300}
    >
      <IconButton
        icon={
          <Box position="relative" display="inline-flex" alignItems="center">
            <BellIcon boxSize={5} />
            {count > 0 && (
              <Badge
                position="absolute"
                top="-6px"
                right="-8px"
                colorScheme="red"
                borderRadius="full"
                fontSize="0.65em"
                minW="1.4em"
                textAlign="center"
              >
                {count > 99 ? '99+' : count}
              </Badge>
            )}
          </Box>
        }
        aria-label={`Notifications zone ${zoneName}`}
        variant="ghost"
        size="sm"
        borderRadius="lg"
        position="relative"
        onClick={() => router.push(href)}
        _hover={{ bg: 'blackAlpha.50', color: hoverColor }}
        _dark={{ _hover: { bg: 'whiteAlpha.100', color: hoverColor } }}
      />
    </Tooltip>
  );
};

export default ZoneNotificationBell;
