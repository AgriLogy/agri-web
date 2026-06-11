/**
 * Owner-facing technician management (/technicians): create scoped read-only
 * logins and grant them a subset of zones + graphs.
 */
import api from './api';

export type ZoneScope = {
  zone_id: number;
  allowed_graphs: string[];
};

export type Technician = {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  is_active: boolean;
  scope: ZoneScope[];
};

export type TechnicianCreatePayload = {
  username: string;
  password: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  scope?: ZoneScope[];
};

export const technicianApi = {
  list: () => api.get<Technician[]>('/technicians').then((r) => r.data),

  create: (payload: TechnicianCreatePayload) =>
    api.post<Technician>('/technicians', payload).then((r) => r.data),

  setScope: (id: number, scope: ZoneScope[]) =>
    api
      .put<Technician>(`/technicians/${id}/scope`, { scope })
      .then((r) => r.data),

  resetPassword: (id: number, password?: string) =>
    api
      .post<{
        status: string;
        password: string;
      }>(`/technicians/${id}/reset-password`, password ? { password } : {})
      .then((r) => r.data),

  revoke: (id: number) =>
    api.delete<void>(`/technicians/${id}`).then((r) => r.data),
};
