'use client';

import {
  StopOutlined,
  UnlockOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import { App, Button, Space } from 'antd';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { adminUserApi, type AdminUserDetail } from '@/app/lib/adminUserApi';

export type UserHeaderActionsProps = {
  user: AdminUserDetail;
  onChange: (next: AdminUserDetail) => void;
};

export function UserHeaderActions({ user, onChange }: UserHeaderActionsProps) {
  const t = useTranslations();
  const { message, modal } = App.useApp();
  const [toggling, setToggling] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    try {
      const updated = await adminUserApi.toggleActive(user.username);
      onChange({ ...user, is_active: updated.is_active });
      message.success(
        updated.is_active
          ? t('admin.userHeaderActions.reactivated')
          : t('admin.userHeaderActions.deactivated')
      );
    } catch {
      message.error(t('admin.userHeaderActions.actionError'));
    } finally {
      setToggling(false);
    }
  };

  const handleReset = () => {
    modal.confirm({
      title: t('admin.userHeaderActions.resetConfirm', { name: user.username }),
      okText: t('admin.userHeaderActions.reset'),
      cancelText: t('admin.userHeaderActions.cancel'),
      onOk: async () => {
        setResetting(true);
        try {
          const { password } = await adminUserApi.resetPassword(user.username);
          modal.info({
            title: t('admin.userHeaderActions.newPasswordTitle'),
            content: (
              <code
                style={{
                  background: 'rgba(0,0,0,0.06)',
                  padding: '4px 8px',
                  borderRadius: 4,
                  userSelect: 'all',
                }}
              >
                {password}
              </code>
            ),
            okText: t('admin.userHeaderActions.close'),
          });
        } catch {
          message.error(t('admin.userHeaderActions.resetError'));
        } finally {
          setResetting(false);
        }
      },
    });
  };

  return (
    <Space>
      <Button
        icon={user.is_active ? <StopOutlined /> : <UserSwitchOutlined />}
        onClick={handleToggle}
        loading={toggling}
      >
        {user.is_active
          ? t('admin.userHeaderActions.deactivate')
          : t('admin.userHeaderActions.reactivate')}
      </Button>
      <Button
        icon={<UnlockOutlined />}
        onClick={handleReset}
        loading={resetting}
      >
        {t('admin.userHeaderActions.resetPassword')}
      </Button>
    </Space>
  );
}

export default UserHeaderActions;
