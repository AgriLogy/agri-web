'use client';

/**
 * Controlled-state model for the alert create/edit form.
 *
 * Replaces the antd `Form.useForm()` FormInstance paradigm with plain React
 * state: `values` are the single source of truth, `errors` mirror the antd
 * field `rules`, and `touched` mirrors antd's `isFieldsTouched()` — it flips
 * only on genuine USER edits (via `setField`), never on programmatic prefill
 * (`patch` / `reset`). That distinction is what drives the create-mode discard
 * confirm exactly like before.
 *
 * Validation + payload building live in pure, dependency-free helpers so they
 * stay unit-testable without next-intl (validation messages are returned as
 * i18n KEYS; the component resolves them).
 */

import { useCallback, useState } from 'react';
import type { AlertRecord, AlertWritePayload } from '@agri/api-client/alertApi';

export interface AlertFormValues {
  name: string;
  type: string;
  description?: string;
  sensor_key: string;
  zone?: number | null;
  notification_zone?: number | null;
  condition: '>' | '<' | '=';
  /** Empty string is the "cleared" state of the threshold NumberInput. */
  condition_nbr: number | '';
  is_active: boolean;
  notify_email: boolean;
  notify_whatsapp: boolean;
  notify_sms: boolean;
  override_phone?: string;
  override_email?: string;
}

export type AlertFormErrors = Partial<Record<keyof AlertFormValues, string>>;

export const ALERT_FORM_DEFAULTS: AlertFormValues = {
  name: '',
  type: 'Weather Temperature',
  description: '',
  sensor_key: 'temperature_weather',
  zone: null,
  notification_zone: null,
  condition: '>',
  condition_nbr: 30,
  is_active: true,
  notify_email: true,
  notify_whatsapp: false,
  notify_sms: false,
  override_phone: '',
  override_email: '',
};

/** Map an existing alert onto the editable form shape (edit-mode prefill). */
export const toFormValues = (alert: AlertRecord): AlertFormValues => ({
  name: alert.name,
  type: alert.type,
  description: alert.description ?? '',
  sensor_key: alert.sensor_key || 'temperature_weather',
  zone: alert.zone ?? null,
  notification_zone: alert.notification_zone ?? null,
  condition: alert.condition,
  condition_nbr:
    alert.threshold ??
    (typeof alert.condition_nbr === 'string'
      ? Number(alert.condition_nbr)
      : Number(alert.condition_nbr ?? 0)),
  is_active: alert.is_active ?? true,
  notify_email: alert.notify_email ?? true,
  notify_whatsapp: alert.notify_whatsapp ?? false,
  notify_sms: alert.notify_sms ?? false,
  override_phone: alert.override_phone ?? '',
  override_email: alert.override_email ?? '',
});

/**
 * Pure validation mirroring the antd `rules`. Returns errors keyed by field
 * with i18n KEYS as messages (the component translates). An empty object means
 * the form is valid.
 */
export const validateAlertForm = (v: AlertFormValues): AlertFormErrors => {
  const errors: AlertFormErrors = {};
  if (!v.name || !v.name.trim()) {
    errors.name = 'alertsPage.form.nameRequired';
  }
  if (!v.sensor_key) {
    errors.sensor_key = 'alertsPage.form.sensorRequired';
  }
  if (
    v.condition_nbr === '' ||
    v.condition_nbr === null ||
    v.condition_nbr === undefined ||
    Number.isNaN(Number(v.condition_nbr))
  ) {
    errors.condition_nbr = 'alertsPage.form.thresholdRequired';
  }
  return errors;
};

/**
 * Normalise the form values into the API payload — byte-for-byte the same
 * transform the antd `handleFinish` used, so create/update payloads are
 * unchanged. Call only after `validateAlertForm` passes.
 */
export const buildAlertPayload = (v: AlertFormValues): AlertWritePayload => ({
  name: v.name.trim(),
  type: v.type,
  description: (v.description ?? '').trim(),
  condition: v.condition,
  condition_nbr: Number(v.condition_nbr),
  sensor_key: v.sensor_key,
  // An alert binds to a farm zone XOR a notification zone; the latter wins.
  zone: v.notification_zone ? null : (v.zone ?? null),
  notification_zone: v.notification_zone ?? null,
  is_active: v.is_active ?? true,
  notify_email: v.notify_email ?? true,
  notify_whatsapp: v.notify_whatsapp ?? false,
  notify_sms: v.notify_sms ?? false,
  override_phone: (v.override_phone ?? '').trim() || null,
  override_email: (v.override_email ?? '').trim() || null,
});

export interface UseAlertForm {
  values: AlertFormValues;
  errors: AlertFormErrors;
  /** True once the user has edited a field — mirrors antd isFieldsTouched(). */
  touched: boolean;
  /** User edit: updates one field, marks touched, clears that field's error. */
  setField: <K extends keyof AlertFormValues>(
    key: K,
    value: AlertFormValues[K]
  ) => void;
  /** Programmatic merge (e.g. /alerts/suggest prefill). Never marks touched. */
  patch: (partial: Partial<AlertFormValues>) => void;
  /** Programmatic reset to defaults or a given set. Never marks touched. */
  reset: (next?: AlertFormValues) => void;
  /** Run validation, store the errors, and return them. */
  validate: () => AlertFormErrors;
}

export function useAlertForm(initial?: AlertRecord | null): UseAlertForm {
  const [values, setValues] = useState<AlertFormValues>(() =>
    initial ? toFormValues(initial) : ALERT_FORM_DEFAULTS
  );
  const [errors, setErrors] = useState<AlertFormErrors>({});
  const [touched, setTouched] = useState(false);

  const setField = useCallback(
    <K extends keyof AlertFormValues>(key: K, value: AlertFormValues[K]) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      setTouched(true);
      setErrors((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    []
  );

  const patch = useCallback((partial: Partial<AlertFormValues>) => {
    setValues((prev) => ({ ...prev, ...partial }));
  }, []);

  const reset = useCallback((next?: AlertFormValues) => {
    setValues(next ?? ALERT_FORM_DEFAULTS);
    setErrors({});
    setTouched(false);
  }, []);

  const validate = useCallback(() => {
    const found = validateAlertForm(values);
    setErrors(found);
    return found;
  }, [values]);

  return { values, errors, touched, setField, patch, reset, validate };
}
