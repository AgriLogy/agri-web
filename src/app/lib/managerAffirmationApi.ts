/** Typed wrapper for /manager-affirmations* . */
import api from './api';

export type AffirmationAction =
  | 'zone_params_change'
  | 'kc_periods_change'
  | 'user_reactivate';

export type AffirmationStatus = 'pending' | 'approved' | 'rejected';

export type Affirmation = {
  id: number;
  action: AffirmationAction;
  payload: Record<string, unknown>;
  status: AffirmationStatus;
  requested_by: number;
  requested_by_username: string;
  decided_by: number | null;
  decided_by_username: string | null;
  decided_at: string | null;
  decision_note: string;
  created_at: string;
  updated_at: string;
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

export const managerAffirmationApi = {
  list: async (status?: AffirmationStatus): Promise<Affirmation[]> => {
    const config = status ? { params: { status } } : undefined;
    const res = await api.get('/manager-affirmations', config);
    return unwrap<Affirmation>(res.data);
  },
  create: async (
    action: AffirmationAction,
    payload: Record<string, unknown> = {}
  ): Promise<Affirmation> => {
    const res = await api.post<Affirmation>('/manager-affirmations', {
      action,
      payload,
    });
    return res.data;
  },
  decide: async (
    id: number,
    decision: 'approve' | 'reject',
    note?: string
  ): Promise<Affirmation> => {
    const res = await api.post<Affirmation>(
      `/manager-affirmations${id}/${decision}/`,
      note ? { note } : {}
    );
    return res.data;
  },
};
