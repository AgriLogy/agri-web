'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Alert, Button, Form, Input, Space } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import axiosInstance from '@/app/lib/api';
import { LoginCard } from '@/app/components/auth/LoginCard';

type LoginFormValues = {
  username: string;
  password: string;
};

type SignInResponse = {
  access: string;
  refresh: string;
};

export default function AdminLoginBox() {
  const router = useRouter();
  const t = useTranslations();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    setErrorMessage('');

    try {
      const { status, data } = await axiosInstance.post<SignInResponse>(
        '/auth/sessions',
        values
      );

      if (status >= 200 && status < 300) {
        localStorage.setItem('accessToken', data.access);
        localStorage.setItem('refreshToken', data.refresh);
        router.push('/admin');
      }
    } catch {
      setErrorMessage(t('misc.adminLogin.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginCard
      title={t('misc.adminLogin.title')}
      subtitle={t('misc.adminLogin.subtitle')}
    >
      {errorMessage && (
        <Alert
          type="error"
          description={errorMessage}
          showIcon
          closable={{ onClose: () => setErrorMessage('') }}
          style={{ marginBottom: '1rem' }}
        />
      )}

      <Form<LoginFormValues>
        layout="vertical"
        size="large"
        autoComplete="on"
        requiredMark={false}
        onFinish={onFinish}
      >
        <Form.Item
          name="username"
          label={t('misc.adminLogin.usernameLabel')}
          rules={[
            {
              required: true,
              message: t('misc.adminLogin.usernameRequired'),
            },
          ]}
        >
          <Input
            prefix={<UserOutlined />}
            placeholder={t('misc.adminLogin.usernamePlaceholder')}
            autoComplete="username"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label={t('misc.adminLogin.passwordLabel')}
          rules={[
            {
              required: true,
              message: t('misc.adminLogin.passwordRequired'),
            },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder={t('misc.adminLogin.passwordPlaceholder')}
            autoComplete="current-password"
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <Button type="primary" htmlType="submit" block loading={loading}>
              {t('misc.adminLogin.submit')}
            </Button>
            <Button type="link" block size="small">
              {t('misc.adminLogin.forgotPassword')}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </LoginCard>
  );
}
