'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { App, Button, Form, Input } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import axiosInstance from '../lib/api';
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
};

export default function LoginBox() {
  const router = useRouter();
  const { notification } = App.useApp();
  const [loading, setLoading] = useState(false);

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
        router.push(data.is_staff ? '/admin' : '/');
      }
    } catch {
      notification.error({
        message: "Nom d'utilisateur ou mot de passe incorrect.",
        placement: 'bottom',
        duration: 4,
        showProgress: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginCard
      title="Se connecter"
      subtitle="Accédez à votre tableau de bord Agrilogy"
    >
      <Form<LoginFormValues>
        layout="vertical"
        size="large"
        autoComplete="on"
        requiredMark={false}
        onFinish={onFinish}
      >
        <Form.Item
          name="username"
          label={<span className={styles.label}>Nom d&apos;utilisateur</span>}
          rules={[
            {
              required: true,
              message: "Veuillez saisir votre nom d'utilisateur.",
            },
          ]}
        >
          <Input
            className={styles.input}
            prefix={<UserOutlined />}
            placeholder="Votre nom d'utilisateur"
            autoComplete="username"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label={<span className={styles.label}>Mot de passe</span>}
          rules={[
            {
              required: true,
              message: 'Veuillez saisir votre mot de passe.',
            },
          ]}
        >
          <Input.Password
            className={styles.input}
            prefix={<LockOutlined />}
            placeholder="Votre mot de passe"
            autoComplete="current-password"
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Se connecter
          </Button>
        </Form.Item>
      </Form>
    </LoginCard>
  );
}
