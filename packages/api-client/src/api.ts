import axios from 'axios';
import { hydrateSsoSession } from './hydrateSsoSession';
import { clearSsoSession } from './clearSsoSession';

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL;
const DEFAULT_API_URL = 'https://back.agrogo-datafarm.com';
// The API base MUST be an absolute http(s) URL in production. A relative value
// (e.g. the local-dev "/api-proxy" same-origin proxy path, which next.config
// rewrites only when PROXY_API_TARGET is set) would resolve against the app's
// own origin in prod and 404 every request. So: keep whatever is configured in
// development (the proxy path is intentional there), but in production ignore a
// non-absolute value and fall back to the backend URL.
export const API_URL =
  RAW_API_URL &&
  (/^https?:\/\//i.test(RAW_API_URL) || process.env.NODE_ENV === 'development')
    ? RAW_API_URL
    : DEFAULT_API_URL;
//  "http://localhost:8000";

if (process.env.NODE_ENV === 'development') {
  console.debug('[NEXT_PUBLIC_API_URL]', API_URL);
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: false, // This prevents sending cookies like CSRF token
});

// Add an interceptor to include the access token in every request
api.interceptors.request.use(
  (config) => {
    // Adopt a single-sign-on session from the identity gateway before the
    // first request so the Bearer header is attached on deep links too.
    hydrateSsoSession();
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const requestUrl = error.config?.url ?? '';
    const isAuthEndpoint =
      requestUrl.includes('/auth/sessions') ||
      requestUrl.includes('/auth/token');

    if (error.response && error.response.status === 401 && !isAuthEndpoint) {
      // Clear local tokens AND the shared SSO cookie; otherwise the redirect
      // below loops forever as the gateway cookie re-hydrates the dead session.
      clearSsoSession();
      // Login route differs per app (web: /login, admin: /admin/login).
      // NEXT_PUBLIC_LOGIN_PATH overrides; default keeps the farmer app's path.
      window.location.href = process.env.NEXT_PUBLIC_LOGIN_PATH || '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
