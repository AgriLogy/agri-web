import axios from 'axios';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://agrilogy-pi.com/';
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
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
