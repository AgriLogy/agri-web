import axios from 'axios';

/** True when the browser could not reach the server (no HTTP response). */
export function isAxiosNetworkError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  if (error.code === 'ERR_NETWORK') return true;
  return error.request != null && error.response == null;
}

/**
 * Avoid noisy console.error / Next overlay for unreachable API in dev.
 * Still logs real HTTP errors (4xx/5xx with response).
 */
export function logOptionalApiFailure(
  context: string,
  error: unknown,
  options?: { silentNetwork?: boolean }
): void {
  const silentNetwork = options?.silentNetwork !== false;
  if (silentNetwork && isAxiosNetworkError(error)) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(
        `[${context}] API unreachable (check NEXT_PUBLIC_API_URL and backend).`
      );
    }
    return;
  }
  if (axios.isAxiosError(error)) {
    console.error(
      `[${context}]`,
      error.response?.status ?? error.code,
      error.response?.data ?? error.message
    );
    return;
  }
  console.error(`[${context}]`, error);
}
