/**
 * Self-service profile: the logged-in user's account identity + default alert
 * contact (name, email, phone). Backed by GET/PATCH /users/me and
 * POST /users/me/change-password.
 */

import api from './api';
import type { AccessLevel } from './accessLevel';

export type NotificationLanguage = 'fr' | 'ar';

export interface UserProfile {
  username: string;
  email: string;
  phone_number: string;
  /** Account holder's given name (optional — legacy users may not have one). */
  first_name?: string;
  /** Account holder's family name. */
  last_name?: string;
  /** Language of the user's notification emails (distinct from the app UI locale). */
  preferred_language: NotificationLanguage;
  /**
   * RBAC tier this caller holds (agri-web #99). Optional so older API builds
   * that predate the field degrade to the most restrictive tier client-side —
   * see `normalizeAccessLevel`. NEVER a security decision; the server enforces.
   */
  access_level?: AccessLevel;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export const userProfileApi = {
  get: () => api.get<UserProfile>('/users/me').then((r) => r.data),

  update: (
    payload: Partial<
      Pick<
        UserProfile,
        | 'email'
        | 'phone_number'
        | 'first_name'
        | 'last_name'
        | 'preferred_language'
      >
    >
  ) => api.patch<UserProfile>('/users/me', payload).then((r) => r.data),

  /**
   * Secure password change: requires the caller's current password for
   * confirmation. The API re-validates the current password server-side before
   * setting the new one.
   */
  changePassword: (payload: ChangePasswordPayload) =>
    api.post<void>('/users/me/change-password', payload).then((r) => r.data),
};
