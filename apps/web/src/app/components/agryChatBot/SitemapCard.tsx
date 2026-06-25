'use client';
import Link from 'next/link';
import { Box, Flex, Text, useColorModeValue } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { SITEMAP_ROUTES } from './siteRoutes';

/**
 * The `/sitemap` command output: a navigable, localized list of every app
 * page. Clicking a row routes there (and closes the slide-out via onNavigate).
 */
export const SitemapCard = ({ onNavigate }: { onNavigate?: () => void }) => {
  const t = useTranslations();

  const linkColor = useColorModeValue('green.600', 'green.300');
  const linkHover = useColorModeValue('green.700', 'green.200');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const cardBorder = useColorModeValue('gray.200', 'gray.600');
  const descColor = useColorModeValue('gray.500', 'gray.400');

  return (
    <Box display="flex" flexDirection="column" gap="6px" w="100%">
      <Text fontSize="13px" fontWeight={600} mb="2px">
        {t('misc.chatbot.sitemap.title')}
      </Text>
      {SITEMAP_ROUTES.map((route) => (
        <Box
          key={route.path}
          as={Link}
          href={route.path}
          onClick={onNavigate}
          display="block"
          px="10px"
          py="7px"
          bg={cardBg}
          border="1px solid"
          borderColor={cardBorder}
          borderRadius="8px"
          textDecoration="none"
          transition="all 0.15s"
          _hover={{ borderColor: linkHover, transform: 'translateX(2px)' }}
        >
          <Flex align="center" gap="6px" mb="1px">
            <Text fontSize="13px">{route.icon}</Text>
            <Text
              fontSize="12.5px"
              fontWeight={600}
              color={linkColor}
              fontFamily="mono"
            >
              {route.path}
            </Text>
            <Text fontSize="12px" fontWeight={500} color={linkColor}>
              — {t(`misc.chatbot.route.${route.key}.label`)}
            </Text>
          </Flex>
          <Text fontSize="11px" color={descColor} pl="20px">
            {t(`misc.chatbot.route.${route.key}.description`)}
          </Text>
        </Box>
      ))}
    </Box>
  );
};
