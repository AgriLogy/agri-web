import api from './api';

export type NotificationDispatchChannels = {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
};

export type ZoneNotificationDispatchPayload = {
  zoneId: number;
  subject: string;
  message: string;
  contactEmail?: string;
  contactPhone?: string;
  channels: NotificationDispatchChannels;
  decisionMeta?: { rulesFired: string[]; et0TimesKc: number };
};

/**
 * v1: logs always; POSTs to backend when the endpoint exists (optional).
 */
export async function dispatchZoneNotificationOutbound(
  payload: ZoneNotificationDispatchPayload
): Promise<void> {
  const entry = { ...payload, queuedAt: new Date().toISOString() };
  console.info('[notification-dispatch]', entry);

  try {
    await api.post('/notifications/zone-outbound', entry);
  } catch {
    /* Backend hook optional in v1 */
  }
}
