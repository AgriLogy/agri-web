/**
 * Typed wrapper for /users/* and users<u>/*
 * (the per-user reads that live under /api/admin).
 */
import api from './api';

export type AdminUserRow = {
  id: number;
  username: string;
  email: string;
  firstname: string;
  lastname: string;
  is_active: boolean;
  is_staff: boolean;
  payement_status: string;
  zones_count: number;
  date_joined: string;
  last_login: string | null;
};

export type AdminUserDetail = AdminUserRow & {
  phone_number: string | null;
  latitude: number | null;
  longitude: number | null;
  notify_every: number;
  last_notified: string | null;
};

export type AdminUserCreatePayload = {
  username: string;
  email: string;
  firstname: string;
  lastname: string;
  phone_number?: string;
  latitude?: number;
  longitude?: number;
  password: string;
  is_staff?: boolean;
  payement_status?: 'actif' | 'suspended';
};

export type AdminUserPatchPayload = Partial<
  Omit<
    AdminUserDetail,
    | 'id'
    | 'username'
    | 'zones_count'
    | 'date_joined'
    | 'last_login'
    | 'last_notified'
  >
>;

export type ActivityEvent = {
  kind: 'joined' | 'login' | 'notified' | 'zones' | 'alert';
  label: string;
  at: string | null;
};

const unwrap = <T>(data: unknown): T[] => {
  if (Array.isArray(data)) return data as T[];
  if (
    data &&
    typeof data === 'object' &&
    Array.isArray((data as Record<string, unknown>).results)
  ) {
    return (data as { results: T[] }).results;
  }
  return [];
};

export const adminUserApi = {
  list: async (search?: string): Promise<AdminUserRow[]> => {
    const url = '/users';
    const config = search ? { params: { search } } : undefined;
    const res = await api.get(url, config);
    return unwrap<AdminUserRow>(res.data);
  },

  retrieve: async (username: string): Promise<AdminUserDetail> => {
    const res = await api.get<AdminUserDetail>(
      `/users/${encodeURIComponent(username)}`
    );
    return res.data;
  },

  create: async (payload: AdminUserCreatePayload): Promise<AdminUserDetail> => {
    const res = await api.post<AdminUserDetail>('/users', payload);
    return res.data;
  },

  update: async (
    username: string,
    payload: AdminUserPatchPayload
  ): Promise<AdminUserDetail> => {
    const res = await api.patch<AdminUserDetail>(
      `/users/${encodeURIComponent(username)}`,
      payload
    );
    return res.data;
  },

  remove: async (username: string): Promise<void> => {
    await api.delete(`/users/${encodeURIComponent(username)}`);
  },

  toggleActive: async (
    username: string,
    isActive?: boolean
  ): Promise<AdminUserDetail> => {
    const body = isActive === undefined ? {} : { is_active: isActive };
    const res = await api.post<AdminUserDetail>(
      `/users/${encodeURIComponent(username)}/activate`,
      body
    );
    return res.data;
  },

  resetPassword: async (
    username: string,
    password?: string
  ): Promise<{ username: string; password: string }> => {
    const body = password ? { password } : {};
    const res = await api.post<{ username: string; password: string }>(
      `/users/${encodeURIComponent(username)}/password-reset`,
      body
    );
    return res.data;
  },

  activity: async (username: string): Promise<ActivityEvent[]> => {
    const res = await api.get<{ events: ActivityEvent[] }>(
      `/users/${encodeURIComponent(username)}/activity`
    );
    return res.data.events ?? [];
  },

  overview: async (): Promise<{
    users_total: number;
    users_active: number;
    staff_total: number;
    zones_total: number;
    alerts_24h: number;
  }> => {
    const res = await api.get('/admin/overview');
    return res.data;
  },
};
