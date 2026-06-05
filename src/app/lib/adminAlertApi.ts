/**
 * Typed wrapper for admin alert override endpoints.
 */
import api from './api';

export type AdminAlertRow = {
  id: number;
  name: string;
  type: string;
  description: string;
  condition: string;
  condition_nbr: string;
  sensor_key: string;
  zone: number | null;
  is_active: boolean;
  last_triggered_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  user: number | null;
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

export const adminAlertApi = {
  listForUser: async (username: string): Promise<AdminAlertRow[]> => {
    const res = await api.get(`/users/${encodeURIComponent(username)}/alerts`);
    return unwrap<AdminAlertRow>(res.data);
  },
  setActive: async (pk: number, isActive: boolean): Promise<AdminAlertRow> => {
    const res = await api.patch<AdminAlertRow>(`/admin/alerts/${pk}`, {
      is_active: isActive,
    });
    return res.data;
  },
  remove: async (pk: number): Promise<void> => {
    await api.delete(`/admin/alerts/${pk}`);
  },
};
