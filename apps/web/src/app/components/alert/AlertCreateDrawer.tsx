'use client';

/**
 * Reusable alert create/edit Drawer.
 *
 * Drop it next to any chart, sensor card, or list view; mount it once
 * with `open={…}` controlled state. Used by both the sensor "last
 * value" cards (inline, never navigates) and by the /alerts page
 * (Nouvelle alerte / Modifier).
 *
 * When `sensorKey` is provided the drawer hits /alerts/suggest on
 * open and prefills the form with mean-based defaults so the user only
 * has to nudge the threshold.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  HStack,
  useToast,
} from '@chakra-ui/react';
import { alertApi, type AlertRecord } from '@agri/api-client/alertApi';
import {
  DEFAULT_SENSOR_KEYS,
  type SensorKeyOption,
} from '@/app/utils/alertChoices';
import api from '@agri/api-client/api';
import { notificationZoneApi } from '@agri/api-client/notificationZoneApi';
import { userProfileApi } from '@agri/api-client/userProfileApi';
import AlertForm from './AlertForm';
import { buildAlertPayload, toFormValues, useAlertForm } from './useAlertForm';

export interface AlertCreateDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Pre-select a sensor (and optionally a zone) and prefill the form
   *  from /alerts/suggest. Ignored when `editing` is set. */
  sensorKey?: string;
  zoneId?: number;
  /** When set, the drawer becomes an "edit" drawer for that alert. */
  editing?: AlertRecord | null;
  /** Called after a successful create / update so the parent can
   *  refresh its alert list (or anything else). */
  onSaved?: () => void;
}

const AlertCreateDrawer: React.FC<AlertCreateDrawerProps> = ({
  open,
  onClose,
  sensorKey,
  zoneId,
  editing = null,
  onSaved,
}) => {
  const t = useTranslations();
  const toast = useToast();
  const { values, errors, touched, setField, patch, reset, validate } =
    useAlertForm();
  const [submitting, setSubmitting] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const discardKeepRef = useRef<HTMLButtonElement>(null);
  const [sensorKeys, setSensorKeys] =
    useState<SensorKeyOption[]>(DEFAULT_SENSOR_KEYS);
  const [zones, setZones] = useState<{ id: number; name: string }[]>([]);
  const [notificationZones, setNotificationZones] = useState<
    { id: number; name: string }[]
  >([]);
  const [defaultContact, setDefaultContact] = useState<{
    phone?: string;
    email?: string;
  }>({});

  // Lazy-load the registry + the zone list once the drawer first opens.
  useEffect(() => {
    if (!open) return;
    void userProfileApi
      .get()
      .then((p) => setDefaultContact({ phone: p.phone_number, email: p.email }))
      .catch(() => {});
    void alertApi
      .sensorKeys()
      .then((keys) => {
        if (Array.isArray(keys) && keys.length > 0) {
          setSensorKeys(
            keys.map((k) => ({ key: k.key, label: k.label, unit: k.unit }))
          );
        }
      })
      .catch(() => {
        /* fall back to defaults */
      });
    void api
      .get<{ id: number; name: string }[]>('/zones')
      .then((r) => {
        if (Array.isArray(r.data)) setZones(r.data);
      })
      .catch(() => {});
    void notificationZoneApi
      .list()
      .then((list) => {
        if (Array.isArray(list)) {
          setNotificationZones(list.map((z) => ({ id: z.id, name: z.name })));
        }
      })
      .catch(() => {});
  }, [open]);

  // Prefill on open: edit-mode maps the alert onto the form; create-mode
  // resets to defaults and, when a sensorKey hint is present, overlays the
  // /alerts/suggest mean-based defaults. Programmatic prefill never marks the
  // form "touched" — only user edits do — so the discard confirm stays honest.
  useEffect(() => {
    if (!open) return;
    if (editing) {
      reset(toFormValues(editing));
      return;
    }
    reset();
    if (!sensorKey) return;
    void alertApi
      .suggest({
        sensor_key: sensorKey,
        ...(zoneId ? { zone_id: zoneId } : {}),
      })
      .then((suggestion) => {
        patch({
          name: suggestion.name,
          type: suggestion.type,
          description: suggestion.description,
          sensor_key: suggestion.sensor_key,
          condition: suggestion.condition,
          condition_nbr: suggestion.condition_nbr,
          is_active: suggestion.is_active,
          ...(zoneId ? { zone: zoneId } : {}),
        });
        if (suggestion.sample_size === 0) {
          toast({
            status: 'info',
            description: t('alertsPage.createDrawer.noRecentReadings'),
            duration: 5000,
            isClosable: true,
          });
        }
      })
      .catch(() => {
        patch({
          sensor_key: sensorKey,
          ...(zoneId ? { zone: zoneId } : {}),
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sensorKey, zoneId, editing]);

  const finishClose = () => {
    reset();
    onClose();
  };

  const requestClose = () => {
    if (submitting) return;
    if (!editing && touched) {
      setDiscardOpen(true);
      return;
    }
    finishClose();
  };

  const confirmDiscard = () => {
    setDiscardOpen(false);
    finishClose();
  };

  const handleSubmit = async () => {
    const found = validate();
    if (Object.keys(found).length > 0) return;
    const payload = buildAlertPayload(values);
    setSubmitting(true);
    try {
      if (editing) {
        await alertApi.update(editing.id, payload);
        toast({
          status: 'success',
          description: t('alertsPage.createDrawer.updateSuccess'),
          duration: 4000,
          isClosable: true,
        });
      } else {
        await alertApi.create(payload);
        toast({
          status: 'success',
          description: t('alertsPage.createDrawer.createSuccess'),
          duration: 4000,
          isClosable: true,
        });
      }
      reset();
      onClose();
      onSaved?.();
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: Record<string, unknown> };
        message?: string;
      };
      const data = e?.response?.data;
      const detail =
        (data &&
          typeof data === 'object' &&
          Object.values(data).flat().filter(Boolean).map(String).join(' · ')) ||
        e?.message ||
        t('alertsPage.createDrawer.saveError');
      toast({
        status: 'error',
        description: detail,
        duration: 6000,
        isClosable: true,
      });
      console.error('alert save failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Drawer
        isOpen={open}
        placement="right"
        onClose={requestClose}
        size={{ base: 'full', md: 'md' }}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton isDisabled={submitting} />
          <DrawerHeader>
            {editing
              ? t('alertsPage.createDrawer.editTitle')
              : t('alertsPage.createDrawer.newTitle')}
          </DrawerHeader>

          <DrawerBody>
            <AlertForm
              values={values}
              errors={errors}
              onChange={setField}
              sensorKeys={sensorKeys}
              zones={zones}
              notificationZones={notificationZones}
              defaultContact={defaultContact}
            />
          </DrawerBody>

          <DrawerFooter>
            <HStack justifyContent="flex-end" width="100%">
              <Button
                variant="ghost"
                onClick={requestClose}
                isDisabled={submitting}
              >
                {t('alertsPage.createDrawer.cancel')}
              </Button>
              <Button
                colorScheme="brand"
                isLoading={submitting}
                onClick={() => void handleSubmit()}
                data-testid="alert-submit-button"
              >
                {editing
                  ? t('alertsPage.createDrawer.update')
                  : t('alertsPage.createDrawer.create')}
              </Button>
            </HStack>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <AlertDialog
        isOpen={discardOpen}
        leastDestructiveRef={discardKeepRef}
        onClose={() => setDiscardOpen(false)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              {t('alertsPage.createDrawer.discardTitle')}
            </AlertDialogHeader>
            <AlertDialogBody />
            <AlertDialogFooter>
              <Button
                ref={discardKeepRef}
                onClick={() => setDiscardOpen(false)}
              >
                {t('alertsPage.createDrawer.discardCancel')}
              </Button>
              <Button colorScheme="red" onClick={confirmDiscard} ml={3}>
                {t('alertsPage.createDrawer.discardOk')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};

export default AlertCreateDrawer;
