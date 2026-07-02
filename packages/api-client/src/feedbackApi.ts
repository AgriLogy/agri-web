// Report-an-issue API + metadata helpers.
//
// Uploads an optional screen recording to Cloudinary, then POSTs the report to
// agri-api `POST /feedback` (which stores it and emails the internal team).
// The reporter's identity is derived server-side from the JWT — we only send
// client-observable context here.
import api from './api';

export type FeedbackMetadata = {
  url: string;
  route: string;
  query_params: string;
  app_version: string;
  environment: string;
  browser: string;
  os: string;
  viewport: string;
  screen_resolution: string;
  device_pixel_ratio: number;
  online: boolean;
  detected_module: string;
  page_title: string;
  timestamp_utc: string;
  local_timezone: string;
  user_country: string;
  session_duration_seconds: number;
  referrer: string;
};

export type FeedbackPayload = {
  type: 'bug';
  title: string;
  description: string;
  video_url?: string;
  metadata: FeedbackMetadata;
};

const ROUTE_TO_MODULE: Record<string, string> = {
  '/': 'Dashboard',
  '/water': 'Water',
  '/plant': 'Plant',
  '/soil': 'Soil',
  '/station': 'Station',
  '/alerts': 'Alerts',
  '/notifications': 'Notifications',
  '/notification-zones': 'Notification Zones',
  '/crop-calendar': 'Crop Calendar',
  '/vannes-pompes': 'Valves & Pumps',
  '/chat': 'Assistant',
  '/settings': 'Settings',
};

type UserAgentBrand = { brand: string; version: string };
type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: { brands: UserAgentBrand[]; platform?: string };
};

const detectBrowser = (): string => {
  const nav = navigator as NavigatorWithUserAgentData;
  const known = nav.userAgentData?.brands?.find((b) =>
    ['Google Chrome', 'Microsoft Edge', 'Opera', 'Firefox'].includes(b.brand)
  );
  return known ? `${known.brand} ${known.version}` : navigator.userAgent;
};

const detectOs = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('Mac OS X')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  return (
    (navigator as NavigatorWithUserAgentData).userAgentData?.platform ??
    'Unknown'
  );
};

export const buildMetadata = (
  pathname: string,
  search: string,
  sessionStart: number
): FeedbackMetadata => ({
  url: window.location.href,
  route: pathname,
  query_params: search,
  app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0',
  environment:
    process.env.NEXT_PUBLIC_ENV ?? process.env.NODE_ENV ?? 'production',
  browser: detectBrowser(),
  os: detectOs(),
  viewport: `${window.innerWidth}x${window.innerHeight}`,
  screen_resolution: `${window.screen.width}x${window.screen.height}`,
  device_pixel_ratio: window.devicePixelRatio,
  online: navigator.onLine,
  detected_module: ROUTE_TO_MODULE[pathname] ?? 'Other',
  page_title: document.title,
  timestamp_utc: new Date().toISOString(),
  local_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  user_country:
    (typeof localStorage !== 'undefined' && localStorage.getItem('country')) ||
    '',
  session_duration_seconds: Math.floor((Date.now() - sessionStart) / 1000),
  referrer: document.referrer,
});

/** Extract a JPEG thumbnail (data URL) from the first frame of a video blob. */
export const extractVideoThumbnail = (blob: Blob): Promise<string> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    video.currentTime = 0.1;
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      resolve('');
      URL.revokeObjectURL(url);
    };
  });

/** Upload a recording to Cloudinary (unsigned). Throws if not configured. */
export const uploadVideo = async (blob: Blob): Promise<string> => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !preset) {
    throw new Error('Cloudinary is not configured');
  }
  const form = new FormData();
  form.append('file', blob, `agrogo-recording-${Date.now()}.webm`);
  form.append('upload_preset', preset);
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
    { method: 'POST', body: form }
  );
  if (!response.ok) throw new Error('Video upload failed');
  const data = await response.json();
  return data.secure_url as string;
};

export const isCloudinaryConfigured = (): boolean =>
  Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
  );

/** POST the report to agri-api. Auth header is injected by the api client. */
export const submitReport = async (payload: FeedbackPayload): Promise<void> => {
  await api.post('/feedback', {
    report_type: payload.type,
    title: payload.title,
    description: payload.description,
    ...(payload.video_url ? { video_url: payload.video_url } : {}),
    metadata: payload.metadata,
  });
};
