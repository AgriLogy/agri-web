'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
      setErrorMessage("Nom d'utilisateur ou mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginCard
      title="Espace administrateur"
      subtitle="Connectez-vous pour gérer la plateforme"
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
          label="Nom d'utilisateur"
          rules={[
            {
              required: true,
              message: "Veuillez saisir votre nom d'utilisateur.",
            },
          ]}
        >
          <Input
            prefix={<UserOutlined />}
            placeholder="Votre nom d'utilisateur"
            autoComplete="username"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label="Mot de passe"
          rules={[
            {
              required: true,
              message: 'Veuillez saisir votre mot de passe.',
            },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Votre mot de passe"
            autoComplete="current-password"
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <Button type="primary" htmlType="submit" block loading={loading}>
              Se connecter
            </Button>
            <Button type="link" block size="small">
              Mot de passe oublié ?
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </LoginCard>
  );
}
