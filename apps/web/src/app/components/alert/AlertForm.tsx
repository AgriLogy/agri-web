'use client';

import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  FormControl,
  FormErrorMessage,
  FormLabel,
  HStack,
  Input,
  NumberInput,
  NumberInputField,
  Select,
  Switch,
  Text,
  Textarea,
  Tooltip,
  VStack,
} from '@chakra-ui/react';
import {
  ALERT_CHOICES,
  CONDITION_CHOICES,
  DEFAULT_SENSOR_KEYS,
  type SensorKeyOption,
} from '@/app/utils/alertChoices';
import type { AlertFormErrors, AlertFormValues } from './useAlertForm';

// Re-export so existing importers (`./AlertForm`) keep resolving the type.
export type { AlertFormValues } from './useAlertForm';

const DESCRIPTION_MAX = 400;

export interface AlertFormProps {
  values: AlertFormValues;
  errors: AlertFormErrors;
  onChange: <K extends keyof AlertFormValues>(
    key: K,
    value: AlertFormValues[K]
  ) => void;
  sensorKeys: SensorKeyOption[];
  zones?: { id: number; name: string }[];
  /** Custom notification zones the alert can bind to instead of a farm zone. */
  notificationZones?: { id: number; name: string }[];
  /** The user's default contact, shown as placeholders for the overrides. */
  defaultContact?: { phone?: string; email?: string };
}

const AlertForm: React.FC<AlertFormProps> = ({
  values,
  errors,
  onChange,
  sensorKeys,
  zones = [],
  notificationZones = [],
  defaultContact,
}) => {
  const t = useTranslations();

  const sensorOptions = useMemo(() => {
    const list = sensorKeys.length > 0 ? sensorKeys : DEFAULT_SENSOR_KEYS;
    return list.map((s) => {
      const name = t.has(`sensors.${s.key}`) ? t(`sensors.${s.key}`) : s.label;
      return { value: s.key, label: `${name} (${s.unit})` };
    });
  }, [sensorKeys, t]);

  const phoneChannels = values.notify_whatsapp || values.notify_sms;
  const emailChannel = values.notify_email;

  return (
    <VStack
      as="form"
      spacing={4}
      align="stretch"
      data-testid="alert-form"
      onSubmit={(e) => e.preventDefault()}
    >
      <FormControl isRequired isInvalid={Boolean(errors.name)}>
        <FormLabel>{t('alertsPage.form.name')}</FormLabel>
        <Input
          value={values.name}
          maxLength={200}
          placeholder={t('alertsPage.form.namePlaceholder')}
          onChange={(e) => onChange('name', e.target.value)}
          data-testid="alert-name-input"
        />
        <FormErrorMessage>{errors.name && t(errors.name)}</FormErrorMessage>
      </FormControl>

      <FormControl isRequired>
        <FormLabel>{t('alertsPage.form.category')}</FormLabel>
        <Select
          value={values.type}
          onChange={(e) => onChange('type', e.target.value)}
          data-testid="alert-type-select"
        >
          {ALERT_CHOICES.map((c) => (
            <option key={c.value} value={c.value}>
              {t(`alertTypes.${c.i18nKey}`)}
            </option>
          ))}
        </Select>
      </FormControl>

      <FormControl isRequired isInvalid={Boolean(errors.sensor_key)}>
        <FormLabel display="flex" alignItems="center" gap={1}>
          <span>{t('alertsPage.form.sensor')}</span>
          <Tooltip label={t('alertsPage.form.sensorTooltip')} hasArrow>
            <Text as="span" color="gray.400" cursor="help" aria-hidden>
              ⓘ
            </Text>
          </Tooltip>
        </FormLabel>
        <Select
          value={values.sensor_key}
          onChange={(e) => onChange('sensor_key', e.target.value)}
          data-testid="alert-sensor-select"
        >
          {sensorOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <FormErrorMessage>
          {errors.sensor_key && t(errors.sensor_key)}
        </FormErrorMessage>
      </FormControl>

      {zones.length > 0 && (
        <FormControl>
          <FormLabel>{t('alertsPage.form.zone')}</FormLabel>
          <Select
            value={values.zone == null ? '' : String(values.zone)}
            onChange={(e) =>
              onChange('zone', e.target.value ? Number(e.target.value) : null)
            }
            data-testid="alert-zone-select"
          >
            <option value="">{t('alertsPage.form.zonePlaceholder')}</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </Select>
        </FormControl>
      )}

      {notificationZones.length > 0 && (
        <FormControl>
          <FormLabel display="flex" alignItems="center" gap={1}>
            <span>{t('alertsPage.form.notificationZone')}</span>
            <Tooltip label={t('alertsPage.form.notificationZoneHint')} hasArrow>
              <Text as="span" color="gray.400" cursor="help" aria-hidden>
                ⓘ
              </Text>
            </Tooltip>
          </FormLabel>
          <Select
            value={
              values.notification_zone == null
                ? ''
                : String(values.notification_zone)
            }
            onChange={(e) =>
              onChange(
                'notification_zone',
                e.target.value ? Number(e.target.value) : null
              )
            }
            data-testid="alert-notification-zone-select"
          >
            <option value="">
              {t('alertsPage.form.notificationZonePlaceholder')}
            </option>
            {notificationZones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </Select>
        </FormControl>
      )}

      <FormControl isRequired isInvalid={Boolean(errors.condition_nbr)}>
        <FormLabel>{t('alertsPage.form.condition')}</FormLabel>
        <HStack spacing={2} align="flex-start">
          <Select
            value={values.condition}
            maxW="140px"
            onChange={(e) =>
              onChange(
                'condition',
                e.target.value as AlertFormValues['condition']
              )
            }
            data-testid="alert-condition-select"
          >
            {CONDITION_CHOICES.map((c) => (
              <option key={c.value} value={c.value}>
                {t(`conditions.${c.i18nKey}`)}
              </option>
            ))}
          </Select>
          <NumberInput
            value={values.condition_nbr === '' ? '' : values.condition_nbr}
            step={0.1}
            maxW="160px"
            onChange={(valueString, valueNumber) =>
              onChange('condition_nbr', valueString === '' ? '' : valueNumber)
            }
          >
            <NumberInputField
              placeholder={t('alertsPage.form.thresholdPlaceholder')}
              data-testid="alert-threshold-input"
            />
          </NumberInput>
        </HStack>
        <Text fontSize="xs" color="gray.500" mt={1}>
          {t('alertsPage.form.thresholdHint')}
        </Text>
        <FormErrorMessage>
          {errors.condition_nbr && t(errors.condition_nbr)}
        </FormErrorMessage>
      </FormControl>

      <FormControl>
        <FormLabel>{t('alertsPage.form.description')}</FormLabel>
        <Textarea
          value={values.description ?? ''}
          rows={3}
          maxLength={DESCRIPTION_MAX}
          onChange={(e) => onChange('description', e.target.value)}
          data-testid="alert-description-input"
        />
        <Text fontSize="xs" color="gray.500" mt={1} textAlign="end">
          {(values.description ?? '').length}/{DESCRIPTION_MAX}
        </Text>
      </FormControl>

      <FormControl>
        <FormLabel>{t('alertsPage.form.channels')}</FormLabel>
        <VStack align="stretch" spacing={2}>
          <HStack spacing={3}>
            <Switch
              size="sm"
              colorScheme="brand"
              isChecked={values.notify_email}
              onChange={(e) => onChange('notify_email', e.target.checked)}
              aria-label={t('alertsPage.form.channelEmail')}
            />
            <Text>{t('alertsPage.form.channelEmail')}</Text>
          </HStack>
          <HStack spacing={3}>
            <Switch
              size="sm"
              colorScheme="brand"
              isChecked={values.notify_whatsapp}
              onChange={(e) => onChange('notify_whatsapp', e.target.checked)}
              aria-label={t('alertsPage.form.channelWhatsapp')}
            />
            <Text>{t('alertsPage.form.channelWhatsapp')}</Text>
          </HStack>
          <HStack spacing={3}>
            <Switch
              size="sm"
              colorScheme="brand"
              isChecked={values.notify_sms}
              onChange={(e) => onChange('notify_sms', e.target.checked)}
              aria-label={t('alertsPage.form.channelSms')}
            />
            <Text>{t('alertsPage.form.channelSms')}</Text>
          </HStack>
        </VStack>
      </FormControl>

      {phoneChannels && (
        <FormControl>
          <FormLabel display="flex" alignItems="center" gap={1}>
            <span>{t('alertsPage.form.overridePhone')}</span>
            <Tooltip label={t('alertsPage.form.overridePhoneHint')} hasArrow>
              <Text as="span" color="gray.400" cursor="help" aria-hidden>
                ⓘ
              </Text>
            </Tooltip>
          </FormLabel>
          <Input
            value={values.override_phone ?? ''}
            placeholder={
              defaultContact?.phone ||
              t('alertsPage.form.overridePhonePlaceholder')
            }
            onChange={(e) => onChange('override_phone', e.target.value)}
          />
        </FormControl>
      )}

      {emailChannel && (
        <FormControl>
          <FormLabel display="flex" alignItems="center" gap={1}>
            <span>{t('alertsPage.form.overrideEmail')}</span>
            <Tooltip label={t('alertsPage.form.overridePhoneHint')} hasArrow>
              <Text as="span" color="gray.400" cursor="help" aria-hidden>
                ⓘ
              </Text>
            </Tooltip>
          </FormLabel>
          <Input
            value={values.override_email ?? ''}
            placeholder={
              defaultContact?.email ||
              t('alertsPage.form.overrideEmailPlaceholder')
            }
            onChange={(e) => onChange('override_email', e.target.value)}
          />
        </FormControl>
      )}

      <FormControl display="flex" alignItems="center" gap={3}>
        <Switch
          colorScheme="brand"
          isChecked={values.is_active}
          onChange={(e) => onChange('is_active', e.target.checked)}
          id="alert-is-active"
        />
        <FormLabel htmlFor="alert-is-active" mb={0}>
          {t('alertsPage.form.active')}
        </FormLabel>
      </FormControl>
    </VStack>
  );
};

export default AlertForm;
