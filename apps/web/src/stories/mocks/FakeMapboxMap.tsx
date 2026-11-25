/**
 * Storybook stand-in for `AgricultureMapboxMap` (aliased in
 * `.storybook/main.ts`). Mapbox needs an access token and WebGL and would
 * fetch real tiles, so stories draw invented fields instead. The real map is
 * only seen in the app.
 */
import React from 'react';
import { Badge, Box, Text, VStack } from '@chakra-ui/react';

type Props = {
  lat: number;
  lon: number;
  showToolsPanel?: boolean;
  fillHeight?: boolean;
  preview?: boolean;
};

export default function FakeMapboxMap({
  showToolsPanel = false,
  fillHeight = false,
}: Props) {
  return (
    <Box
      position="relative"
      w="100%"
      h={fillHeight ? '100%' : { base: '360px', md: '480px' }}
      minH="280px"
      bg="#dfe8d0"
      borderRadius="md"
      overflow="hidden"
      data-testid="storybook-fake-map"
    >
      <svg
        viewBox="0 0 400 300"
        preserveAspectRatio="xMidYMid slice"
        width="100%"
        height="100%"
        aria-hidden="true"
      >
        <rect width="400" height="300" fill="#e4ecd6" />
        <path
          d="M0 210 C120 190 260 240 400 200"
          stroke="#9cc3e6"
          strokeWidth="10"
          fill="none"
        />
        <polygon
          points="40,40 180,30 190,130 50,140"
          fill="#8fbf6a"
          fillOpacity="0.7"
          stroke="#2f6b2a"
          strokeWidth="2"
        />
        <polygon
          points="210,40 360,55 345,160 220,150"
          fill="#c9d77a"
          fillOpacity="0.7"
          stroke="#2f6b2a"
          strokeWidth="2"
        />
        <polygon
          points="70,160 200,165 190,185 60,190"
          fill="#6fae5a"
          fillOpacity="0.7"
          stroke="#2f6b2a"
          strokeWidth="2"
        />
        <circle
          cx="115"
          cy="85"
          r="6"
          fill="#1f5fbf"
          stroke="#fff"
          strokeWidth="2"
        />
        <circle
          cx="280"
          cy="100"
          r="6"
          fill="#1f5fbf"
          stroke="#fff"
          strokeWidth="2"
        />
        <text x="70" y="65" fontSize="12" fill="#1d3b1a">
          Parcelle A
        </text>
        <text x="240" y="80" fontSize="12" fill="#1d3b1a">
          Parcelle B
        </text>
      </svg>
      <Text
        position="absolute"
        bottom={2}
        insetStart={2}
        fontSize="xs"
        bg="whiteAlpha.800"
        px={2}
        py={0.5}
        borderRadius="sm"
        color="gray.700"
      >
        Aperçu (la carte Mapbox n’est pas chargée dans Storybook)
      </Text>
      {showToolsPanel ? (
        <VStack
          position="absolute"
          top={2}
          insetEnd={2}
          align="stretch"
          spacing={1}
          bg="white"
          p={2}
          borderRadius="md"
          boxShadow="md"
          fontSize="xs"
          minW="140px"
        >
          <Badge colorScheme="green" alignSelf="flex-start">
            Outils carte
          </Badge>
          <Text>Dessiner un secteur</Text>
          <Text>Placer un capteur</Text>
          <Text>Importer un KML</Text>
        </VStack>
      ) : null}
    </Box>
  );
}
