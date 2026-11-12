// Push registration (agri-api #37 / #489). An install — here, a browser —
// registers its FCM token; the backend pushes firing alerts to every
// registered token of the user. The web token is remembered locally so
// sign-out can unregister it before the session is revoked.

import api from './api';

export type PushPlatform = 'android' | 'ios' | 'web';

export interface PushDevice {
  id: number;
  platform: PushPlatform;
  app_version: string;
  token_tail: string;
  created_at: string;
  last_seen_at: string;
}

export interface PushDeviceList {
  /** False while the server has no FCM credentials: nothing would be sent. */
  push_configured: boolean;
  devices: PushDevice[];
}

const BASE = '/devices/push-tokens';
export const WEB_PUSH_TOKEN_KEY = 'agri.webPushToken';

export const pushApi = {
  register: (token: string, platform: PushPlatform, appVersion = '') =>
    api
      .post<{ id: number; created: boolean; push_configured: boolean }>(BASE, {
        token,
        platform,
        app_version: appVersion,
      })
      .then((r) => r.data),

  unregister: (token: string) =>
    api.delete(BASE, { data: { token } }).then(() => undefined),

  list: () => api.get<PushDeviceList>(BASE).then((r) => r.data),
};

export const storedWebPushToken = (): string | null => {
  try {
    return typeof window === 'undefined'
      ? null
      : window.localStorage.getItem(WEB_PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const rememberWebPushToken = (token: string | null): void => {
  try {
    if (typeof window === 'undefined') return;
    if (token) window.localStorage.setItem(WEB_PUSH_TOKEN_KEY, token);
    else window.localStorage.removeItem(WEB_PUSH_TOKEN_KEY);
  } catch {
    // storage blocked (private mode): nothing to remember
  }
};

/** Best-effort: drop this browser's push registration (used on sign-out, so
 * the next person on a shared computer doesn't get the previous user's alerts). */
export const forgetWebPush = async (): Promise<void> => {
  const token = storedWebPushToken();
  if (!token) return;
  try {
    await pushApi.unregister(token);
  } catch {
    // ignore — sign-out must never be blocked
  }
  rememberWebPushToken(null);
};
