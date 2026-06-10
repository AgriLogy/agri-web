/**
 * Self-service profile: the logged-in user's default alert contact
 * (phone + email). Backed by GET/PATCH /users/me.
 */

import api from './api';

export interface UserProfile {
  username: string;
  email: string;
  phone_number: string;
}

export const userProfileApi = {
  get: () => api.get<UserProfile>('/users/me').then((r) => r.data),

  update: (payload: Partial<Pick<UserProfile, 'email' | 'phone_number'>>) =>
    api.patch<UserProfile>('/users/me', payload).then((r) => r.data),
};
