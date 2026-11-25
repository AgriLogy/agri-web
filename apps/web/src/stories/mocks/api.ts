/**
 * Shared fakes for stories (agri-web #195). Storybook points the API client
 * at API_BASE (see .storybook/main.ts); MSW answers from these handlers.
 * Use `http.get(api('/sectors'), …)` in a story's `parameters.msw.handlers`.
 * Data is invented — never real farms, people or coordinates.
 */
export const API_BASE = 'https://api.storybook.invalid';

export const api = (path: string) => `${API_BASE}${path}`;

/** A small invented farm reused across stories. */
export const demoZones = [
  { id: 1, name: 'Zone A1 — Tomates', area_m2: 12000 },
  { id: 2, name: 'Zone A2 — Agrumes', area_m2: 8000 },
];

/** GET /users/me for an editor ("Ferme démo"), used by every story. */
export const demoMe = {
  id: 42,
  username: 'Ferme démo',
  email: 'demo@example.invalid',
  access_level: 'editor',
  is_staff: false,
  is_technician: false,
};
