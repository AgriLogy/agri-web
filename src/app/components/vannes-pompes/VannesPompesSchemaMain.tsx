'use client';

import React, { useCallback, useEffect, useId, useState } from 'react';
import NextLink from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Badge,
  Box,
  Button,
  Circle,
  Divider,
  Flex,
  Heading,
  HStack,
  SimpleGrid,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import ValveSchematic from '@/app/components/vannes-pompes/ValveSchematic';
import PumpSchematic from '@/app/components/vannes-pompes/PumpSchematic';
import {
  loadVannesPompesFromStorage,
  VANNES_POMPES_STORAGE_KEY,
  VANNES_POMPES_UPDATED_EVENT,
  type Pump,
  type Vane,
} from '@/app/utils/vannesPompesStorage';

function MiniTank() {
  const top = useColorModeValue('gray.300', 'gray.500');
  const body = useColorModeValue('gray.400', 'gray.600');
  const edge = useColorModeValue('gray.500', 'gray.400');
  return (
    <Box position="relative" w="32px" pt="6px">
      <Box
        position="absolute"
        top={0}
        left="50%"
        transform="translateX(-50%)"
        w="22px"
        h="8px"
        bg={top}
        borderRadius="full"
        borderWidth="1px"
        borderColor={edge}
        zIndex={1}
      />
      <Box
        w="26px"
        h="22px"
        mx="auto"
        bgGradient={`linear(to-b, ${top}, ${body})`}
        borderRadius="md"
        borderWidth="1px"
        borderColor={edge}
        boxShadow="inner"
      />
    </Box>
  );
}

function InlinePumpGlyph({
  running,
  label,
}: {
  running: boolean;
  label: string;
}) {
  const gradId = useId().replace(/:/g, '');
  const lineStroke = useColorModeValue('#1e293b', '#e2e8f0');
  const idleFill = useColorModeValue('#94a3b8', '#64748b');
  const glow = useColorModeValue(
    'rgba(16, 185, 129, 0.35)',
    'rgba(52, 211, 153, 0.45)'
  );
  const fill = running ? '#10b981' : idleFill;
  const ring = useColorModeValue('white', 'gray.700');
  const ringBorder = useColorModeValue('gray.200', 'gray.600');
  const labelColor = useColorModeValue('gray.600', 'gray.400');

  return (
    <VStack spacing={1}>
      <Box
        position="relative"
        px={3}
        py={2}
        borderRadius="full"
        bg={ring}
        borderWidth="1px"
        borderColor={ringBorder}
        boxShadow={
          running
            ? `0 0 0 1px ${glow}, 0 8px 24px -4px ${glow}`
            : '0 2px 8px rgba(0,0,0,0.06)'
        }
      >
        <svg width="56" height="30" viewBox="0 0 56 30" aria-hidden>
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={running ? '#34d399' : fill} />
              <stop offset="100%" stopColor={running ? '#059669' : fill} />
            </linearGradient>
          </defs>
          <rect
            x="4"
            y="7"
            width="48"
            height="16"
            rx="8"
            fill={running ? `url(#${gradId})` : fill}
            stroke={lineStroke}
            strokeWidth="1.5"
          />
          <circle cx="28" cy="15" r="4" fill={lineStroke} opacity={0.25} />
        </svg>
      </Box>
      <Text
        fontSize="11px"
        fontWeight="semibold"
        color={labelColor}
        noOfLines={2}
        textAlign="center"
        maxW="100px"
      >
        {label}
      </Text>
    </VStack>
  );
}

function SchemaSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const cardBg = useColorModeValue('white', 'gray.800');
  const border = useColorModeValue('gray.100', 'gray.700');
  const accent = useColorModeValue('teal.500', 'teal.300');
  const subtitle = useColorModeValue('gray.500', 'gray.400');
  const cardShadow = useColorModeValue(
    '0 1px 3px rgba(0,0,0,0.06)',
    '0 4px 24px rgba(0, 0, 0, 0.35)'
  );

  return (
    <Box
      position="relative"
      bg={cardBg}
      borderRadius="2xl"
      borderWidth="1px"
      borderColor={border}
      overflow="hidden"
      boxShadow={cardShadow}
    >
      <Box
        position="absolute"
        left={0}
        top={0}
        bottom={0}
        w="4px"
        bg={accent}
        aria-hidden
      />
      <Box
        pl={{ base: 5, md: 7 }}
        pr={{ base: 5, md: 8 }}
        py={{ base: 5, md: 7 }}
      >
        <Text
          fontSize="10px"
          fontWeight="bold"
          letterSpacing="0.2em"
          textTransform="uppercase"
          color={accent}
          mb={1}
        >
          {eyebrow}
        </Text>
        <Heading
          size="sm"
          fontWeight="700"
          letterSpacing="-0.02em"
          mb={description ? 1 : 4}
        >
          {title}
        </Heading>
        {description && (
          <Text
            fontSize="sm"
            color={subtitle}
            mb={6}
            maxW="lg"
            lineHeight="tall"
          >
            {description}
          </Text>
        )}
        {!description && <Box mb={2} />}
        {children}
      </Box>
    </Box>
  );
}

const VannesPompesSchemaMain = () => {
  const t = useTranslations();
  const pageBg = useColorModeValue('gray.50', 'gray.900');
  const titleColor = useColorModeValue('gray.900', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const footerNoteBg = useColorModeValue('blue.50', 'whiteAlpha.50');
  const shellBg = useColorModeValue('white', 'gray.800');
  const shellBorder = useColorModeValue('gray.200', 'gray.700');
  const shellShadow = useColorModeValue(
    '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
  );
  const emptyCircleBg = useColorModeValue('teal.50', 'whiteAlpha.100');
  const pipeBarShadow = useColorModeValue(
    'inset 0 2px 4px rgba(255,255,255,0.35), 0 2px 8px rgba(14,165,233,0.2)',
    'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 12px rgba(2,132,199,0.25)'
  );
  const valveStationBg = useColorModeValue('gray.50', 'gray.900');
  const valveStationBorder = useColorModeValue('gray.100', 'gray.600');
  const valveHoverShadow = useColorModeValue(
    '0 12px 24px -8px rgba(0,0,0,0.1)',
    '0 12px 24px -8px rgba(0,0,0,0.4)'
  );
  const dividerColor = useColorModeValue('gray.100', 'gray.600');
  const innerTrackBg = useColorModeValue('gray.50', 'gray.900');
  const innerTrackBorder = useColorModeValue('gray.100', 'gray.600');
  const footerLegendAccent = useColorModeValue('blue.800', 'blue.200');
  const footerBorderColor = useColorModeValue('blue.100', 'whiteAlpha.100');

  const [vanes, setVanes] = useState<Vane[]>([]);
  const [pumps, setPumps] = useState<Pump[]>([]);

  const refresh = useCallback(() => {
    const { vanes: v, pumps: p } = loadVannesPompesFromStorage();
    setVanes(v);
    setPumps(p);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onCustom = () => refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === VANNES_POMPES_STORAGE_KEY || e.key === null) refresh();
    };
    window.addEventListener(VANNES_POMPES_UPDATED_EVENT, onCustom);
    window.addEventListener('storage', onStorage);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener(VANNES_POMPES_UPDATED_EVENT, onCustom);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  const mainlinePump = pumps.length > 0 ? pumps[0] : undefined;
  const dosingPumps = pumps.length > 1 ? pumps.slice(1) : [];

  const pipeTrack = useColorModeValue(
    'linear(to-r, #7dd3fc 0%, #38bdf8 50%, #7dd3fc 100%)',
    'linear(to-r, #0369a1 0%, #0284c7 50%, #0369a1 100%)'
  );

  return (
    <Box minH="100%" bg={pageBg} pb={10}>
      <Box
        maxW="container.xl"
        mx="auto"
        px={{ base: 4, md: 8 }}
        py={{ base: 5, md: 8 }}
      >
        <Flex
          align={{ base: 'stretch', md: 'flex-start' }}
          justify="space-between"
          direction={{ base: 'column', md: 'row' }}
          gap={6}
          mb={8}
        >
          <VStack align={{ base: 'stretch', md: 'flex-start' }} spacing={3}>
            <HStack>
              <Badge
                colorScheme="brand"
                variant="subtle"
                borderRadius="md"
                px={2}
                py={0.5}
                fontSize="10px"
                letterSpacing="wider"
              >
                {t('misc.vannesPompesSchema.synoptic')}
              </Badge>
            </HStack>
            <Heading
              size="xl"
              color={titleColor}
              fontWeight="800"
              letterSpacing="-0.03em"
              lineHeight="shorter"
            >
              {t('misc.vannesPompesSchema.pageTitle')}
            </Heading>
            <Text
              fontSize="md"
              color={mutedColor}
              maxW="lg"
              fontWeight="medium"
            >
              {t('misc.vannesPompesSchema.pageSubtitle')}
            </Text>
            <Button
              as={NextLink}
              href="/vannes-pompes"
              variant="outline"
              size="sm"
              leftIcon={<ArrowBackIcon />}
              alignSelf={{ base: 'stretch', md: 'flex-start' }}
              borderRadius="lg"
            >
              {t('misc.vannesPompesSchema.backToManagement')}
            </Button>
          </VStack>
        </Flex>

        <Box
          borderRadius="3xl"
          p={{ base: 4, md: 6, lg: 8 }}
          bg={shellBg}
          borderWidth="1px"
          borderColor={shellBorder}
          boxShadow={shellShadow}
        >
          {vanes.length === 0 && pumps.length === 0 ? (
            <Flex
              direction="column"
              align="center"
              justify="center"
              py={{ base: 16, md: 20 }}
              px={4}
              textAlign="center"
            >
              <Circle size="64px" bg={emptyCircleBg} mb={5}>
                <Text fontSize="2xl" opacity={0.9}>
                  ⊕
                </Text>
              </Circle>
              <Heading size="md" color={titleColor} mb={2}>
                {t('misc.vannesPompesSchema.emptyTitle')}
              </Heading>
              <Text color={mutedColor} maxW="md" mb={8} lineHeight="tall">
                {t('misc.vannesPompesSchema.emptyDescription')}
              </Text>
              <Button
                as={NextLink}
                href="/vannes-pompes"
                colorScheme="brand"
                size="lg"
                borderRadius="xl"
                px={8}
              >
                {t('misc.vannesPompesSchema.configureNetwork')}
              </Button>
            </Flex>
          ) : (
            <VStack spacing={8} align="stretch">
              {vanes.length > 0 && (
                <SchemaSection
                  eyebrow={t('misc.vannesPompesSchema.valvesEyebrow')}
                  title={t('misc.vannesPompesSchema.valvesTitle')}
                  description={t('misc.vannesPompesSchema.valvesDescription')}
                >
                  <HStack
                    justify="center"
                    spacing={{ base: 3, md: 5 }}
                    flexWrap="wrap"
                    mb={4}
                  >
                    {vanes.map((vane) => (
                      <Flex
                        key={`tank-${vane.id}`}
                        w={{ base: '80px', md: '96px' }}
                        justify="center"
                      >
                        <MiniTank />
                      </Flex>
                    ))}
                  </HStack>
                  <Box
                    h="12px"
                    bgGradient={pipeTrack}
                    borderRadius="full"
                    mx={{ base: 1, md: 6 }}
                    mb={0}
                    boxShadow={pipeBarShadow}
                  />
                  <SimpleGrid
                    columns={{
                      base: 2,
                      sm: 3,
                      md: Math.min(6, vanes.length) || 1,
                    }}
                    spacing={{ base: 3, md: 4 }}
                    mt={6}
                    justifyItems="center"
                  >
                    {vanes.map((vane, index) => (
                      <Box
                        key={vane.id}
                        w="full"
                        maxW="140px"
                        p={4}
                        borderRadius="xl"
                        bg={valveStationBg}
                        borderWidth="1px"
                        borderColor={valveStationBorder}
                        transition="box-shadow 0.2s, transform 0.2s"
                        _hover={{
                          boxShadow: valveHoverShadow,
                        }}
                      >
                        <VStack spacing={2} align="center">
                          <HStack
                            w="full"
                            justify="space-between"
                            align="center"
                          >
                            <Badge
                              colorScheme={vane.active ? 'green' : 'gray'}
                              borderRadius="md"
                              fontSize="9px"
                              px={1.5}
                            >
                              {vane.active
                                ? t('misc.vannesPompesSchema.valveOpen')
                                : t('misc.vannesPompesSchema.valveClosed')}
                            </Badge>
                            <Text
                              fontSize="10px"
                              fontWeight="bold"
                              color={mutedColor}
                            >
                              #{index + 1}
                            </Text>
                          </HStack>
                          <Box
                            w="10px"
                            h="16px"
                            bgGradient={pipeTrack}
                            borderRadius="full"
                            flexShrink={0}
                          />
                          <ValveSchematic
                            active={vane.active}
                            label={String(index + 1)}
                            compact
                            showTopRun={false}
                            showBottomDrop
                          />
                          <VStack spacing={0} align="center" pt={1}>
                            <Text
                              fontSize="xs"
                              fontWeight="bold"
                              color={titleColor}
                              sx={{ fontVariantNumeric: 'tabular-nums' }}
                            >
                              0.0
                            </Text>
                            <Text
                              fontSize="10px"
                              color={mutedColor}
                              sx={{ fontVariantNumeric: 'tabular-nums' }}
                            >
                              {t('misc.vannesPompesSchema.target', {
                                value: '4.0',
                              })}
                            </Text>
                          </VStack>
                          <Text
                            fontSize="10px"
                            color={mutedColor}
                            textAlign="center"
                            noOfLines={2}
                            fontWeight="medium"
                            lineHeight="short"
                          >
                            {vane.name}
                          </Text>
                        </VStack>
                      </Box>
                    ))}
                  </SimpleGrid>
                </SchemaSection>
              )}

              {pumps.length > 0 && (
                <>
                  {vanes.length > 0 && <Divider borderColor={dividerColor} />}
                  <SchemaSection
                    eyebrow={t('misc.vannesPompesSchema.mainlineEyebrow')}
                    title={t('misc.vannesPompesSchema.mainlineTitle')}
                    description={t(
                      'misc.vannesPompesSchema.mainlineDescription'
                    )}
                  >
                    <Flex
                      align="center"
                      justify="center"
                      gap={0}
                      px={{ base: 2, md: 10 }}
                      py={6}
                      borderRadius="xl"
                      bg={innerTrackBg}
                      borderWidth="1px"
                      borderColor={innerTrackBorder}
                    >
                      <Box
                        flex={1}
                        maxW="200px"
                        h="14px"
                        bgGradient={pipeTrack}
                        borderRadius="full"
                      />
                      {mainlinePump && (
                        <InlinePumpGlyph
                          running={mainlinePump.running}
                          label={mainlinePump.name}
                        />
                      )}
                      <Box
                        flex={1}
                        maxW="200px"
                        h="14px"
                        bgGradient={pipeTrack}
                        borderRadius="full"
                      />
                    </Flex>
                    {mainlinePump && (
                      <HStack justify="center" mt={3} spacing={2}>
                        <Circle
                          size="8px"
                          bg={mainlinePump.running ? 'green.400' : 'gray.400'}
                        />
                        <Text
                          fontSize="xs"
                          color={mutedColor}
                          fontWeight="medium"
                        >
                          {mainlinePump.running
                            ? t('misc.vannesPompesSchema.pumpRunning')
                            : t('misc.vannesPompesSchema.pumpStopped')}
                        </Text>
                      </HStack>
                    )}
                  </SchemaSection>
                </>
              )}

              {dosingPumps.length > 0 && (
                <>
                  <Divider borderColor={dividerColor} />
                  <SchemaSection
                    eyebrow={t('misc.vannesPompesSchema.dosingEyebrow')}
                    title={t('misc.vannesPompesSchema.dosingTitle')}
                    description={t('misc.vannesPompesSchema.dosingDescription')}
                  >
                    <Flex
                      justify="center"
                      gap={{ base: 8, md: 12 }}
                      flexWrap="wrap"
                      align="flex-end"
                    >
                      {dosingPumps.map((pump, i) => (
                        <Box
                          key={pump.id}
                          p={5}
                          borderRadius="xl"
                          bg={valveStationBg}
                          borderWidth="1px"
                          borderColor={valveStationBorder}
                          textAlign="center"
                          minW="120px"
                        >
                          <PumpSchematic
                            running={pump.running}
                            label={String(i + 2)}
                          />
                          <Badge
                            mt={3}
                            colorScheme={pump.running ? 'green' : 'gray'}
                            borderRadius="md"
                            fontSize="9px"
                          >
                            {pump.running
                              ? t('misc.vannesPompesSchema.pumpOn')
                              : t('misc.vannesPompesSchema.pumpOff')}
                          </Badge>
                          <Text
                            fontSize="xs"
                            color={mutedColor}
                            mt={2}
                            fontWeight="medium"
                            noOfLines={2}
                          >
                            {pump.name}
                          </Text>
                        </Box>
                      ))}
                    </Flex>
                  </SchemaSection>
                </>
              )}
            </VStack>
          )}
        </Box>

        <Box
          mt={6}
          p={4}
          borderRadius="xl"
          bg={footerNoteBg}
          borderWidth="1px"
          borderColor={footerBorderColor}
        >
          <Text fontSize="xs" color={mutedColor} lineHeight="tall">
            <Text as="span" fontWeight="bold" color={footerLegendAccent}>
              {t('misc.vannesPompesSchema.legendLabel')}{' '}
            </Text>
            {t('misc.vannesPompesSchema.legendBody', {
              current: '0.0',
              target: '4.0',
            })}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default VannesPompesSchemaMain;
