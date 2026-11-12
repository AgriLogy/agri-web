'use client';

/**
 * "Notifications on this browser" control for the alerts page (agri-api #37).
 * Hidden entirely when the Firebase web config isn't set. Permission is only
 * requested from the button click.
 */
import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Box, Button, HStack, Text, useToast } from '@chakra-ui/react';
import { FaBell, FaBellSlash } from 'react-icons/fa';

import {
  disableWebPush,
  enableWebPush,
  webPushState,
  type WebPushState,
} from '@/app/lib/webPush';

const WebPushToggle = () => {
  const t = useTranslations('alertsPage.webPush');
  const toast = useToast();
  const [state, setState] = useState<WebPushState>(() => webPushState());
  const [busy, setBusy] = useState(false);

  if (state === 'unconfigured') return null;

  const run = async (action: () => Promise<WebPushState>) => {
    setBusy(true);
    try {
      const next = await action();
      setState(next);
      if (next === 'on') {
        toast({
          status: 'success',
          description: t('enabled'),
          isClosable: true,
        });
      }
    } catch (err) {
      console.error('web push toggle failed', err);
      toast({ status: 'error', description: t('error'), isClosable: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      bg="app.surface"
      borderWidth="1px"
      borderColor="app.border"
      borderRadius="lg"
      px={{ base: 3, md: 4 }}
      py={3}
      mb={4}
      data-testid="web-push"
      data-state={state}
    >
      <HStack justify="space-between" align="center" flexWrap="wrap" gap={2}>
        <Box minW={0}>
          <Text fontWeight="semibold" fontSize="sm">
            {t('title')}
          </Text>
          <Text fontSize="xs" color="gray.500">
            {t(`hint_${state}`)}
          </Text>
        </Box>
        {state === 'off' ? (
          <Button
            size="sm"
            colorScheme="brand"
            leftIcon={<FaBell />}
            isLoading={busy}
            onClick={() => void run(() => enableWebPush())}
            data-testid="web-push-enable"
          >
            {t('enable')}
          </Button>
        ) : state === 'on' ? (
          <Button
            size="sm"
            variant="outline"
            leftIcon={<FaBellSlash />}
            isLoading={busy}
            onClick={() => void run(() => disableWebPush())}
            data-testid="web-push-disable"
          >
            {t('disable')}
          </Button>
        ) : null}
      </HStack>
    </Box>
  );
};

export default WebPushToggle;
