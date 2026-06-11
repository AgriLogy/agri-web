'use client';

import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

type FetcherResult<T> = T | T[] | null | undefined;

export type UseAdminEntityState<T> = {
  data: T | null;
  list: T[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setData: (next: T | null) => void;
  setList: (next: T[]) => void;
};

/**
 * Tiny load-on-mount hook for admin pages: tracks loading + error,
 * funnels failures into antd `message.error`, exposes a refetch.
 *
 * The fetcher returns either a single entity or a list — the hook
 * normalises both shapes onto `data` / `list`.
 */
export function useAdminEntity<T>(
  fetcher: () => Promise<FetcherResult<T>>,
  options: { onErrorLabel?: string; immediate?: boolean } = {}
): UseAdminEntityState<T> {
  const t = useTranslations();
  const { onErrorLabel = t('admin.common.loadError'), immediate = true } =
    options;
  const { message } = App.useApp();
  const [data, setData] = useState<T | null>(null);
  const [list, setList] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(immediate);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (Array.isArray(result)) {
        setList(result);
        setData(null);
      } else if (result == null) {
        setList([]);
        setData(null);
      } else {
        setData(result);
        setList([]);
      }
    } catch (err) {
      const detail =
        (err as { message?: string })?.message ??
        t('admin.common.unknownError');
      setError(detail);
      message.error(onErrorLabel);
    } finally {
      setLoading(false);
    }
  }, [fetcher, message, onErrorLabel, t]);

  useEffect(() => {
    if (immediate) {
      void run();
    }
  }, [immediate, run]);

  return {
    data,
    list,
    loading,
    error,
    refetch: run,
    setData,
    setList,
  };
}
