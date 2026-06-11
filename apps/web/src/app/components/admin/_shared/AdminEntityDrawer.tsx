'use client';

import { Button, Drawer, Space } from 'antd';
import type { ReactNode } from 'react';

export type AdminEntityDrawerProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void | Promise<void>;
  title: string;
  submitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  width?: number | string;
  size?: 'default' | 'large';
  destroyOnHidden?: boolean;
  children: ReactNode;
};

/**
 * Drawer with the project's standard Cancel/Submit footer.
 * Mirrors the AlertCreateDrawer footer shape so every admin
 * form has the same affordances.
 */
export function AdminEntityDrawer({
  open,
  onClose,
  onSubmit,
  title,
  submitting = false,
  submitLabel = 'Enregistrer',
  cancelLabel = 'Annuler',
  width,
  size = 'default',
  destroyOnHidden = true,
  children,
}: AdminEntityDrawerProps) {
  return (
    <Drawer
      title={title}
      open={open}
      onClose={onClose}
      size={size}
      width={width}
      destroyOnHidden={destroyOnHidden}
      footer={
        <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onClose} disabled={submitting}>
            {cancelLabel}
          </Button>
          <Button type="primary" loading={submitting} onClick={onSubmit}>
            {submitLabel}
          </Button>
        </Space>
      }
    >
      {children}
    </Drawer>
  );
}

export default AdminEntityDrawer;
