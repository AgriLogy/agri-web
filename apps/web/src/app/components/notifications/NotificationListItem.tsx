'use client';

import React from 'react';
import {
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Badge,
  Box,
  Circle,
  HStack,
  IconButton,
  Text,
  Tooltip,
} from '@chakra-ui/react';
import { ChevronDownIcon, DeleteIcon, EditIcon } from '@chakra-ui/icons';
import { useLocale, useTranslations } from 'next-intl';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import { useNotificationDecision } from '@/app/hooks/useNotificationDecision';
import type { NotificationDecisionLevel } from '@agri/api-client/notificationDecisionEngine';
import NotificationDetailFrench from '@/app/components/notifications/NotificationDetailFrench';
import type { NotificationPayload } from '@/app/components/notifications/Notification';

const localeTag = (locale: string): string =>
  locale === 'ar' ? 'ar' : locale === 'en' ? 'en-GB' : 'fr-FR';

/** Shared critical/advisory/ok colour semantics (matches the card + detail). */
const decisionDotColor = (d: NotificationDecisionLevel): string => {
  if (d === 'critical') return 'red.500';
  if (d === 'advisory') return 'orange.400';
  return 'green.500';
};

export interface NotificationListItemProps {
  id: number;
  notification: NotificationPayload;
  /** Raw API `notification` object for optional detail fields (CE, NPK, …). */
  rawNested?: Record<string, unknown>;
  is_read: boolean;
  /** Fired the first time an unread row is expanded (mark-as-read). */
  onOpen?: () => void;
  onEditZone?: () => void;
  onDeleteZone?: () => void;
}

const NotificationListItem: React.FC<NotificationListItemProps> = ({
  id,
  notification,
  rawNested,
  is_read,
  onOpen,
  onEditZone,
  onDeleteZone,
}) => {
  const t = useTranslations();
  const locale = useLocale();
  const { bg, textColor, hoverColor } = useColorModeStyles();

  const { decision, config } = useNotificationDecision(id, notification);

  const zoneId = notification.zone_id;
  const configName = config?.notificationName?.trim() ?? '';
  const title =
    configName.length > 0
      ? configName
      : notification.zone_name?.trim() ||
        (zoneId != null
          ? t('notifications.card.zoneNumber', { id: zoneId })
          : t('notifications.card.notificationFallback'));

  const zoneSub =
    notification.zone_name?.trim() && notification.zone_name.trim() !== title
      ? notification.zone_name.trim()
      : '';

  const formattedDate = new Date(notification.notification_date).toLocaleString(
    localeTag(locale),
    {
      dateStyle: 'short',
      timeStyle: 'short',
    }
  );

  const decisionLabel = (d: NotificationDecisionLevel): string => {
    if (d === 'critical') return t('notifications.card.decisionCritical');
    if (d === 'advisory') return t('notifications.card.decisionAdvisory');
    return t('notifications.card.decisionOk');
  };

  const isConfirmation = Boolean(notification.template_summary);

  const handleChange = (expandedIndex: number | number[]) => {
    const open = Array.isArray(expandedIndex)
      ? expandedIndex.length > 0
      : expandedIndex === 0;
    if (open && !is_read) onOpen?.();
  };

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <Accordion allowToggle onChange={handleChange}>
      <AccordionItem
        border="1px solid"
        borderColor={is_read ? 'inherit' : hoverColor}
        borderRadius="lg"
        bg={bg}
        overflow="hidden"
        data-testid={`notif-item-${id}`}
      >
        {({ isExpanded }) => (
          <>
            <AccordionButton
              px={{ base: 3, md: 4 }}
              py={3}
              _hover={{ bg: 'blackAlpha.50', _dark: { bg: 'whiteAlpha.100' } }}
              color={textColor}
            >
              {!is_read && (
                <Circle
                  size="8px"
                  bg="red.500"
                  mr={3}
                  flexShrink={0}
                  data-testid="notif-unread"
                  aria-label={t('notifications.list.unread')}
                />
              )}

              {isConfirmation ? (
                <Badge colorScheme="brand" mr={3} flexShrink={0}>
                  {t('notifications.card.zoneConfirmation')}
                </Badge>
              ) : decision ? (
                <Tooltip label={decisionLabel(decision.decision)} hasArrow>
                  <Circle
                    size="12px"
                    bg={decisionDotColor(decision.decision)}
                    mr={3}
                    flexShrink={0}
                    data-testid="notif-decision"
                    data-decision={decision.decision}
                    aria-label={decisionLabel(decision.decision)}
                  />
                </Tooltip>
              ) : (
                <Circle size="12px" bg="gray.300" mr={3} flexShrink={0} />
              )}

              <Box flex="1" textAlign="left" minW={0}>
                <Text
                  fontWeight={is_read ? 'medium' : 'bold'}
                  fontSize="sm"
                  noOfLines={1}
                  data-testid="notif-title"
                >
                  {title}
                </Text>
                <HStack
                  spacing={2}
                  mt={0.5}
                  fontSize="xs"
                  color="gray.500"
                  flexWrap="wrap"
                >
                  <Text as="span" data-testid="notif-date">
                    {formattedDate}
                  </Text>
                  {zoneSub && (
                    <>
                      <Text as="span">·</Text>
                      <Text as="span">📍 {zoneSub}</Text>
                    </>
                  )}
                </HStack>
              </Box>

              {zoneId != null && onEditZone && (
                <Tooltip
                  label={t('notifications.card.editNotification')}
                  hasArrow
                >
                  <IconButton
                    as="span"
                    role="button"
                    tabIndex={0}
                    aria-label={t('notifications.card.editNotification')}
                    icon={<EditIcon />}
                    size="sm"
                    variant="ghost"
                    colorScheme="brand"
                    ml={1}
                    onClick={(e) => {
                      stop(e);
                      onEditZone();
                    }}
                  />
                </Tooltip>
              )}
              {onDeleteZone && (
                <Tooltip
                  label={t('notifications.card.deleteNotification')}
                  hasArrow
                >
                  <IconButton
                    as="span"
                    role="button"
                    tabIndex={0}
                    aria-label={t('notifications.card.deleteNotification')}
                    icon={<DeleteIcon />}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    ml={1}
                    onClick={(e) => {
                      stop(e);
                      onDeleteZone();
                    }}
                    data-testid="notif-delete"
                  />
                </Tooltip>
              )}

              <ChevronDownIcon boxSize={5} ml={2} flexShrink={0} />
            </AccordionButton>

            <AccordionPanel
              px={{ base: 3, md: 4 }}
              pb={4}
              borderTopWidth="1px"
              borderColor="gray.100"
              _dark={{ borderColor: 'whiteAlpha.200' }}
            >
              {isExpanded && (
                <NotificationDetailFrench
                  id={id}
                  notification={notification}
                  rawNested={rawNested}
                />
              )}
            </AccordionPanel>
          </>
        )}
      </AccordionItem>
    </Accordion>
  );
};

export default NotificationListItem;
