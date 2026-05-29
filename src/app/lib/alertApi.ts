/**
 * Thin axios wrapper around /alerts/ + /api/alerts/ endpoints.
 *
 * Centralises the alert payload contract so the alert page, the chart
 * overlay, and the unit tests all agree on field names. Keep this file
 * synchronised with analytics/serializers.py::AlertSerializer.
 */

import api from './api';

export interface AlertRecord {
  id: number;
  name: string;
  type: string;
  description: string;
  condition: '>' | '<' | '=';
  condition_nbr: string | number;
  threshold: number | null;
  sensor_key: string;
  zone: number | null;
  is_active: boolean;
  last_triggered_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  user: number;
}

export interface GraphAlert {
  id: number;
  name: string;
  sensor_key: string;
  zone_id: number | null;
  condition: '>' | '<' | '=';
  threshold: number;
  unit: string | null;
  label: string | null;
  is_active: boolean;
  latest_value: number | null;
  latest_timestamp: string | null;
  is_triggered: boolean;
  last_triggered_at: string | null;
}

export interface AlertWritePayload {
  name: string;
  type: string;
  description?: string;
  condition: '>' | '<' | '=';
  condition_nbr: number | string;
  sensor_key: string;
  zone?: number | null;
  is_active?: boolean;
}

export const alertApi = {
  list: (params?: { sensor_key?: string; zone_id?: number }) =>
    api.get<AlertRecord[]>('/alerts', { params }).then((r) => r.data),

  create: (payload: AlertWritePayload) =>
    api.post<AlertRecord>('/alerts', payload).then((r) => r.data),

  update: (id: number, payload: Partial<AlertWritePayload>) =>
    api.patch<AlertRecord>(`/alerts/${id}/`, payload).then((r) => r.data),

  remove: (id: number) =>
    api.delete<void>(`/alerts/${id}/`).then((r) => r.data),

  forGraph: (params: { sensor_key: string; zone_id?: number }) =>
    api
      .get<{ alerts: GraphAlert[] }>('/alerts/for-graph', { params })
      .then((r) => r.data.alerts),

  sensorKeys: () =>
    api
      .get<{
        keys: { key: string; label: string; unit: string }[];
      }>('/sensors')
      .then((r) => r.data.keys),

  suggest: (params: { sensor_key: string; zone_id?: number }) =>
    api.get<AlertSuggestion>('/alerts/suggest', { params }).then((r) => r.data),
};

export interface AlertSuggestion {
  sensor_key: string;
  label: string;
  unit: string;
  type: string;
  name: string;
  description: string;
  condition: '>' | '<' | '=';
  condition_nbr: number;
  mean: number | null;
  sample_size: number;
  is_active: boolean;
}
