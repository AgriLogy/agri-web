'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { App, Button, Form, Input } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import axiosInstance from '@agri/api-client/api';
import { LoginCard } from '../components/auth/LoginCard';
import styles from './LoginBox.module.scss';

type LoginFormValues = {
  username: string;
  password: string;
};

type SignInResponse = {
  access: string;
  refresh: string;
  is_staff: boolean;
  is_technician?: boolean;
};

export default function LoginBox() {
  const router = useRouter();
  const { notification } = App.useApp();
  const [loading, setLoading] = useState(false);
  const t = useTranslations('auth');

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);

    try {
      const { status, data } = await axiosInstance.post<SignInResponse>(
        '/auth/sessions',
        values
      );

      if (status >= 200 && status < 300) {
        localStorage.setItem('accessToken', data.access);
        localStorage.setItem('refreshToken', data.refresh);
        localStorage.setItem('isTechnician', data.is_technician ? '1' : '0');
        // Admin now lives in a separate repo (agri-admin) on its own domain.
        // NEXT_PUBLIC_ADMIN_URL points at it; falls back to /admin for local dev.
        if (data.is_staff) {
          const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL;
          if (adminUrl) {
            window.location.href = adminUrl;
          } else {
            router.push('/admin');
          }
        } else {
          router.push('/');
        }
      }
    } catch {
      notification.error({
        message: t('invalidCredentials'),
        placement: 'bottom',
        duration: 4,
        showProgress: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginCard title={t('title')} subtitle={t('subtitle')}>
      <Form<LoginFormValues>
        layout="vertical"
        size="large"
        autoComplete="on"
        requiredMark={false}
        onFinish={onFinish}
      >
        <Form.Item
          name="username"
          label={<span className={styles.label}>{t('username')}</span>}
          rules={[
            {
              required: true,
              message: t('usernameRequired'),
            },
          ]}
        >
          <Input
            className={styles.input}
            prefix={<UserOutlined />}
            placeholder={t('usernamePlaceholder')}
            autoComplete="username"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label={<span className={styles.label}>{t('password')}</span>}
          rules={[
            {
              required: true,
              message: t('passwordRequired'),
            },
          ]}
        >
          <Input.Password
            className={styles.input}
            prefix={<LockOutlined />}
            placeholder={t('passwordPlaceholder')}
            autoComplete="current-password"
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" block loading={loading}>
            {t('submit')}
          </Button>
        </Form.Item>
      </Form>
    </LoginCard>
  );
}
