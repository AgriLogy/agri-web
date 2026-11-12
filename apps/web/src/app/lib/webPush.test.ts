/**
 * Browser push (agri-api #37): config gating, state, and the enable/disable
 * flows with the Firebase SDK and the API client mocked. Also checks that
 * sign-out unregisters this browser before the session is revoked.
 */
const mockPost = jest.fn();
const mockDelete = jest.fn();

jest.mock('@agri/api-client/api', () => ({
  __esModule: true,
  default: {
    post: (...a: unknown[]) => mockPost(...a),
    delete: (...a: unknown[]) => mockDelete(...a),
    get: jest.fn(),
  },
}));

const mockGetToken = jest.fn();
const mockDeleteToken = jest.fn();
jest.mock('firebase/app', () => ({
  getApps: () => [],
  initializeApp: (cfg: unknown) => ({ cfg }),
}));
jest.mock('firebase/messaging', () => ({
  getMessaging: () => ({ m: true }),
  isSupported: () => Promise.resolve(true),
  getToken: (...a: unknown[]) => mockGetToken(...a),
  deleteToken: (...a: unknown[]) => mockDeleteToken(...a),
}));

import {
  disableWebPush,
  enableWebPush,
  SW_PATH,
  webPushConfig,
  webPushState,
  type WebPushConfig,
} from './webPush';
import { WEB_PUSH_TOKEN_KEY } from '@agri/api-client/pushApi';
import { logoutEverywhere } from '@agri/api-client/logoutEverywhere';

const CONFIG: WebPushConfig = {
  apiKey: 'k',
  projectId: 'agrogo',
  messagingSenderId: '123',
  appId: '1:123:web:abc',
  vapidKey: 'BPublicVapid',
};

const registration = { scope: '/' };
let permission: NotificationPermission = 'default';
const requestPermission = jest.fn(() => Promise.resolve(permission));

const installBrowserApis = () => {
  Object.defineProperty(window, 'Notification', {
    configurable: true,
    value: {
      get permission() {
        return permission;
      },
      requestPermission,
    },
  });
  Object.defineProperty(window, 'PushManager', {
    configurable: true,
    value: function PushManager() {},
  });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { register: jest.fn(() => Promise.resolve(registration)) },
  });
};

const removeBrowserApis = () => {
  delete (window as unknown as Record<string, unknown>).Notification;
  delete (window as unknown as Record<string, unknown>).PushManager;
  delete (navigator as unknown as Record<string, unknown>).serviceWorker;
};

beforeEach(() => {
  mockPost.mockReset().mockResolvedValue({ data: { id: 1, created: true } });
  mockDelete.mockReset().mockResolvedValue({});
  mockGetToken.mockReset().mockResolvedValue('fcm-web-token');
  mockDeleteToken.mockReset().mockResolvedValue(true);
  requestPermission.mockClear();
  permission = 'default';
  window.localStorage.clear();
  installBrowserApis();
});

afterEach(removeBrowserApis);

describe('webPushConfig', () => {
  it('is null unless all five Firebase values are set', () => {
    expect(webPushConfig({})).toBeNull();
    expect(
      webPushConfig({
        NEXT_PUBLIC_FIREBASE_API_KEY: 'k',
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'p',
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: 's',
        NEXT_PUBLIC_FIREBASE_APP_ID: 'a',
        NEXT_PUBLIC_FIREBASE_VAPID_KEY: ' ',
      })
    ).toBeNull();
    expect(
      webPushConfig({
        NEXT_PUBLIC_FIREBASE_API_KEY: 'k',
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'p',
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: 's',
        NEXT_PUBLIC_FIREBASE_APP_ID: 'a',
        NEXT_PUBLIC_FIREBASE_VAPID_KEY: 'v',
      })
    ).toEqual({
      apiKey: 'k',
      projectId: 'p',
      messagingSenderId: 's',
      appId: 'a',
      vapidKey: 'v',
    });
  });
});

describe('webPushState', () => {
  it('reports unconfigured, unsupported, denied, off and on', () => {
    expect(webPushState(null)).toBe('unconfigured');
    expect(webPushState(CONFIG)).toBe('off');
    permission = 'denied';
    expect(webPushState(CONFIG)).toBe('denied');
    permission = 'granted';
    expect(webPushState(CONFIG)).toBe('off'); // granted but never registered here
    window.localStorage.setItem(WEB_PUSH_TOKEN_KEY, 't');
    expect(webPushState(CONFIG)).toBe('on');
    removeBrowserApis();
    expect(webPushState(CONFIG)).toBe('unsupported');
  });
});

describe('enableWebPush', () => {
  it('asks permission, gets the FCM token with our worker and registers it', async () => {
    permission = 'granted';
    await expect(enableWebPush(CONFIG)).resolves.toBe('on');

    expect(requestPermission).toHaveBeenCalled();
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith(SW_PATH);
    expect(mockGetToken).toHaveBeenCalledWith(
      { m: true },
      { vapidKey: 'BPublicVapid', serviceWorkerRegistration: registration }
    );
    expect(mockPost).toHaveBeenCalledWith('/devices/push-tokens', {
      token: 'fcm-web-token',
      platform: 'web',
      app_version: '',
    });
    expect(window.localStorage.getItem(WEB_PUSH_TOKEN_KEY)).toBe(
      'fcm-web-token'
    );
  });

  it('stops at a refusal without touching the backend', async () => {
    permission = 'denied';
    await expect(enableWebPush(CONFIG)).resolves.toBe('denied');
    expect(mockGetToken).not.toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
  });
});

describe('disableWebPush', () => {
  it('unregisters on the backend, deletes the FCM token and forgets it', async () => {
    window.localStorage.setItem(WEB_PUSH_TOKEN_KEY, 'fcm-web-token');
    await expect(disableWebPush(CONFIG)).resolves.toBe('off');
    expect(mockDelete).toHaveBeenCalledWith('/devices/push-tokens', {
      data: { token: 'fcm-web-token' },
    });
    expect(mockDeleteToken).toHaveBeenCalled();
    expect(window.localStorage.getItem(WEB_PUSH_TOKEN_KEY)).toBeNull();
  });
});

describe('sign-out', () => {
  it('unregisters this browser before revoking the session', async () => {
    window.localStorage.setItem(WEB_PUSH_TOKEN_KEY, 'fcm-web-token');
    await logoutEverywhere('/bye').catch(() => undefined);
    const urls = mockDelete.mock.calls.map(([url]) => url);
    expect(urls.slice(0, 2)).toEqual([
      '/devices/push-tokens',
      '/auth/sessions',
    ]);
    expect(window.localStorage.getItem(WEB_PUSH_TOKEN_KEY)).toBeNull();
  });
});
