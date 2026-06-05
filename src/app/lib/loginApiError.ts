import axios from 'axios';

/**
 * Minimal translator shape compatible with next-intl's `useTranslations()` /
 * `getTranslations()` root translator. Callers pass `t` so messages are localized;
 * when omitted, the French fallback strings below are used (non-React contexts).
 */
type Translator = (key: string, values?: Record<string, unknown>) => string;

const FALLBACK = {
  'data.loginError.wrongCreds': "Nom d'utilisateur ou mot de passe incorrect.",
  'data.loginError.unexpected': 'Une erreur inattendue est survenue.',
  'data.loginError.unreachable':
    'Impossible de joindre le serveur. Vérifiez votre connexion.',
  'data.loginError.tooManyAttempts':
    'Trop de tentatives de connexion. Réessayez plus tard.',
  'data.loginError.wrongCreds400':
    'Nom d’utilisateur ou mot de passe incorrect. (400 — voir l’onglet Réseau pour le détail du serveur.)',
} as const;

function tr(t: Translator | undefined, key: keyof typeof FALLBACK): string {
  return t ? t(key) : FALLBACK[key];
}

function firstString(val: unknown): string | null {
  if (typeof val === 'string' && val.trim()) return val;
  if (Array.isArray(val) && val[0] != null) return String(val[0]);
  return null;
}

/**
 * Maps sign-in API errors to a short message for the UI / toast.
 * Pass a next-intl translator (`t`) to localize; falls back to French otherwise.
 * Server-provided messages (detail/error/field errors) are returned verbatim.
 */
export function formatLoginApiError(error: unknown, t?: Translator): string {
  if (!axios.isAxiosError(error)) {
    return tr(t, 'data.loginError.unexpected');
  }
  if (!error.response) {
    return tr(t, 'data.loginError.unreachable');
  }

  const { status, data } = error.response;
  const d = (data && typeof data === 'object' ? data : {}) as Record<
    string,
    unknown
  >;

  const detail = firstString(d.detail);
  if (detail) return detail;

  const apiError = firstString(d.error);
  if (apiError) return apiError;

  const nfe = firstString(d.non_field_errors);
  if (nfe) return nfe;

  for (const key of ['username', 'email', 'password']) {
    const v = firstString(d[key]);
    if (v) return v;
  }

  if (status === 429) {
    return tr(t, 'data.loginError.tooManyAttempts');
  }
  if (status === 401) return tr(t, 'data.loginError.wrongCreds');
  if (status === 400) {
    return tr(t, 'data.loginError.wrongCreds400');
  }
  return tr(t, 'data.loginError.wrongCreds');
}
