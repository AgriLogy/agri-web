'use client';

/**
 * Expanded farm map: the dashboard "Farm & sectors" card opened in a large
 * modal (same pattern as the Météo card → WeatherDetailsModal), so sectors
 * and sensors can be read and edited with real screen room. Full screen on
 * mobile, 6xl on desktop.
 *
 * The caller unmounts its own card map while this is open, so only one
 * Mapbox instance exists at a time; each instance loads from the server on
 * mount, which keeps the card in sync with edits made here.
 */

import React from 'react';
import dynamic from 'next/dynamic';
import {
  Box,
  Button,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
} from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import Loading from '@component/common/Loading';
import { useCan } from '@/app/hooks/useAccessLevel';

const AgricultureMapboxMap = dynamic(
  () => import('@component/map/AgricultureMapboxMap'),
  {
    ssr: false,
    loading: () => <Loading />,
  }
);

interface FarmMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  lat: number;
  lon: number;
  /** Tools-panel state, shared with the card so the toggle carries over. */
  toolsOpen: boolean;
  onToggleTools: () => void;
}

export default function FarmMapModal({
  isOpen,
  onClose,
  lat,
  lon,
  toolsOpen,
  onToggleTools,
}: FarmMapModalProps) {
  const t = useTranslations();
  const { canEdit } = useCan();

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={{ base: 'full', md: '6xl' }}>
      <ModalOverlay />
      <ModalContent
        mx={{ base: 0, md: 8 }}
        my={{ base: 0, md: 6 }}
        h={{ base: '100dvh', md: 'calc(100vh - 3rem)' }}
        display="flex"
        flexDirection="column"
      >
        <ModalHeader pb={2} pe={14}>
          <HStack justify="space-between" spacing={3}>
            <Text as="span" noOfLines={1}>
              {t('misc.googleMapWeather.title')}
            </Text>
            {canEdit ? (
              <Button
                size="sm"
                variant={toolsOpen ? 'solid' : 'outline'}
                colorScheme="brand"
                onClick={onToggleTools}
                flexShrink={0}
              >
                {toolsOpen
                  ? t('misc.googleMapWeather.hideTools')
                  : t('misc.googleMapWeather.showTools')}
              </Button>
            ) : null}
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={4} flex="1" minH={0} display="flex" overflowY="auto">
          <Box flex="1" minH={0} w="100%">
            {/* The map's own ResizeObserver re-fits the canvas as the modal
                scales in, so it can mount straight away. */}
            <AgricultureMapboxMap
              lat={lat}
              lon={lon}
              showToolsPanel={toolsOpen}
              fillHeight
            />
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
