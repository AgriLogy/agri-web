'use client';

import { App, Button, Popconfirm } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export type AdminConfirmDeleteProps = {
  onConfirm: () => Promise<void>;
  title?: string;
  okText?: string;
  cancelText?: string;
  successMessage?: string;
  errorMessage?: string;
  /** Render a custom trigger (defaults to a danger `Button`). */
  trigger?: (loading: boolean) => React.ReactNode;
};

/**
 * Drop-in delete confirmation:
 *   <AdminConfirmDelete onConfirm={() => api.remove(id)} />
 *
 * Handles loading state, success/error messages, and a sensible
 * default trigger button.
 */
export function AdminConfirmDelete({
  onConfirm,
  title,
  okText,
  cancelText,
  successMessage,
  errorMessage,
  trigger,
}: AdminConfirmDeleteProps) {
  const t = useTranslations();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const resolvedTitle = title ?? t('admin.confirmDelete.title');
  const resolvedOkText = okText ?? t('admin.confirmDelete.ok');
  const resolvedCancelText = cancelText ?? t('admin.confirmDelete.cancel');
  const resolvedSuccessMessage =
    successMessage ?? t('admin.confirmDelete.success');
  const resolvedErrorMessage = errorMessage ?? t('admin.confirmDelete.error');

  const handle = async () => {
    setLoading(true);
    try {
      await onConfirm();
      message.success(resolvedSuccessMessage);
    } catch {
      message.error(resolvedErrorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popconfirm
      title={resolvedTitle}
      okText={resolvedOkText}
      okButtonProps={{ danger: true, loading }}
      cancelText={resolvedCancelText}
      onConfirm={handle}
    >
      {trigger ? (
        trigger(loading)
      ) : (
        <Button danger icon={<DeleteOutlined />} loading={loading}>
          {t('admin.confirmDelete.button')}
        </Button>
      )}
    </Popconfirm>
  );
}

export default AdminConfirmDelete;
