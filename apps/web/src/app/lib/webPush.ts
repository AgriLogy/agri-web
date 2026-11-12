/**
 * Browser push for alerts (agri-api #37): the farmer opts in on the alerts
 * page, the browser gets an FCM registration token through the Firebase JS
 * SDK, and the token is registered with the backend (platform "web"). When an
 * alert fires, the backend pushes it; `public/firebase-messaging-sw.js` shows
 * the notification even with the tab closed.
 *
 * Off unless the Firebase web config is set (NEXT_PUBLIC_FIREBASE_*); the SDK
 * is only downloaded when the user turns push on. Permission is requested
 * only from that explicit click, never on page load.
 */
import {
  pushApi,
  rememberWebPushToken,
  storedWebPushToken,
} from '@agri/api-client/pushApi';

export const SW_PATH = '/firebase-messaging-sw.js';

export interface WebPushConfig {
  apiKey: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
}

/** The Firebase web config, or null when any piece is missing (feature off).
 * NEXT_PUBLIC_* must be read with literal names so Next inlines them. */
export const webPushConfig = (
  env: Record<string, string | undefined> = {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_VAPID_KEY: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  }
): WebPushConfig | null => {
  const cfg = {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() ?? '',
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ?? '',
    messagingSenderId:
      env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() ?? '',
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim() ?? '',
    vapidKey: env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim() ?? '',
  };
  return Object.values(cfg).every(Boolean) ? cfg : null;
};

export type WebPushState =
  | 'unconfigured' // no Firebase web config → hide the feature
  | 'unsupported' // no service worker / Push API / Notification
  | 'denied' // the user blocked notifications for this site
  | 'off' // available, not enabled on this browser
  | 'on'; // enabled: this browser's token is registered

export const webPushSupported = (): boolean =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

export const webPushState = (
  config: WebPushConfig | null = webPushConfig()
): WebPushState => {
  if (!config) return 'unconfigured';
  if (!webPushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission === 'granted' && storedWebPushToken()) {
    return 'on';
  }
  return 'off';
};

const messagingFor = async (config: WebPushConfig) => {
  const [{ initializeApp, getApps }, messaging] = await Promise.all([
    import('firebase/app'),
    import('firebase/messaging'),
  ]);
  const app =
    getApps()[0] ??
    initializeApp({
      apiKey: config.apiKey,
      projectId: config.projectId,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId,
    });
  return { messaging, instance: messaging.getMessaging(app) };
};

/** Ask permission (must be called from a user gesture), get the FCM token and
 * register it. Resolves to the resulting state. */
export const enableWebPush = async (
  config: WebPushConfig | null = webPushConfig()
): Promise<WebPushState> => {
  if (!config) return 'unconfigured';
  if (!webPushSupported()) return 'unsupported';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return permission === 'denied' ? 'denied' : 'off';
  }
  const registration = await navigator.serviceWorker.register(SW_PATH);
  const { messaging, instance } = await messagingFor(config);
  if (!(await messaging.isSupported())) return 'unsupported';
  const token = await messaging.getToken(instance, {
    vapidKey: config.vapidKey,
    serviceWorkerRegistration: registration,
  });
  if (!token) return 'off';
  await pushApi.register(token, 'web');
  rememberWebPushToken(token);
  return 'on';
};

/** Unregister this browser (backend first, then the FCM token itself). */
export const disableWebPush = async (
  config: WebPushConfig | null = webPushConfig()
): Promise<WebPushState> => {
  const token = storedWebPushToken();
  if (token) {
    try {
      await pushApi.unregister(token);
    } catch {
      // keep going: still forget it locally
    }
  }
  rememberWebPushToken(null);
  if (config && webPushSupported()) {
    try {
      const { messaging, instance } = await messagingFor(config);
      await messaging.deleteToken(instance);
    } catch {
      // the backend no longer has it; a stale FCM token is harmless
    }
  }
  return config ? 'off' : 'unconfigured';
};
