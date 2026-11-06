'use client';

/**
 * Language + zone pickers above the chat input (agri-api#472). Both are
 * remembered (ChatContext persists them), so a farmer who always asks about
 * the same plot in Darija sets this once.
 */

import { useEffect, useState } from 'react';
import { Flex, Select, useColorModeValue } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';

import { farmMapApi, type ZoneOption } from '@agri/api-client/farmMapApi';
import type { AssistantLanguage } from '@agri/api-client/assistantApi';
import { useChat } from './ChatContext';

const LANGUAGE_OPTIONS: AssistantLanguage[] = ['auto', 'ary', 'ar', 'fr', 'en'];

export const ChatControls = () => {
  const t = useTranslations();
  const { language, setLanguage, zoneId, setZoneId, streaming } = useChat();
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const bg = useColorModeValue('white', 'gray.800');
  const border = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    let alive = true;
    farmMapApi
      .listZones()
      .then((z) => {
        if (alive) setZones(Array.isArray(z) ? z : []);
      })
      .catch(() => {
        /* no zones → the zone picker just stays on "all zones" */
      });
    return () => {
      alive = false;
    };
  }, []);

  // A remembered zone that no longer exists (deleted, other account) is dropped.
  useEffect(() => {
    if (
      zones.length &&
      zoneId !== null &&
      !zones.some((z) => z.id === zoneId)
    ) {
      setZoneId(null);
    }
  }, [zones, zoneId, setZoneId]);

  const common = {
    size: 'xs' as const,
    bg,
    borderColor: border,
    borderRadius: '8px',
    fontSize: '11.5px',
    isDisabled: streaming,
  };

  return (
    <Flex gap="6px">
      <Select
        {...common}
        flex="1"
        aria-label={t('misc.chatbot.controls.language')}
        value={language}
        onChange={(e) => setLanguage(e.target.value as AssistantLanguage)}
      >
        {LANGUAGE_OPTIONS.map((l) => (
          <option key={l} value={l}>
            {t(`misc.chatbot.controls.languages.${l}`)}
          </option>
        ))}
      </Select>
      {zones.length > 0 ? (
        <Select
          {...common}
          flex="1"
          aria-label={t('misc.chatbot.controls.zone')}
          value={zoneId ?? ''}
          onChange={(e) =>
            setZoneId(e.target.value === '' ? null : Number(e.target.value))
          }
        >
          <option value="">{t('misc.chatbot.controls.allZones')}</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </Select>
      ) : null}
    </Flex>
  );
};
