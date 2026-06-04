'use client';

import { Space, Tag } from 'antd';
import { useTranslations } from 'next-intl';
import type { AdminUserDetail } from '@/app/lib/adminUserApi';

const formatDate = (iso: string | null): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return iso;
  }
};

export function UserStatusLine({ user }: { user: AdminUserDetail }) {
  const t = useTranslations();
  return (
    <Space size={8} wrap>
      {user.is_staff ? (
        <Tag color="brand">{t('admin.userList.role.admin')}</Tag>
      ) : (
        <Tag>{t('admin.userList.role.user')}</Tag>
      )}
      <Tag color={user.is_active ? 'green' : 'red'}>
        {user.is_active
          ? t('admin.userList.status.active')
          : t('admin.userList.status.inactive')}
      </Tag>
      <Tag color={user.payement_status === 'actif' ? 'green' : 'orange'}>
        {t('admin.userDetail.paymentLabel', { status: user.payement_status })}
      </Tag>
      <span style={{ opacity: 0.7 }}>
        {t('admin.userDetail.joinedLastLogin', {
          joined: formatDate(user.date_joined),
          lastLogin: formatDate(user.last_login),
        })}
      </span>
    </Space>
  );
}

export default UserStatusLine;
