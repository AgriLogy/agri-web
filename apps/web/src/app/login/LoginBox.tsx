'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { FaEye, FaEyeSlash, FaLock, FaUser } from 'react-icons/fa';
import axiosInstance from '@agri/api-client/api';
import { LoginCard } from '../components/auth/LoginCard';

type SignInResponse = {
  access: string;
  refresh: string;
  is_staff: boolean;
  is_technician?: boolean;
};

export default function LoginBox() {
  const router = useRouter();
  const toast = useToast();
  const t = useTranslations('auth');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    let hasError = false;
    if (!username) {
      setUsernameError(t('usernameRequired'));
      hasError = true;
    }
    if (!password) {
      setPasswordError(t('passwordRequired'));
      hasError = true;
    }
    if (hasError) return;

    setLoading(true);

    try {
      const { status, data } = await axiosInstance.post<SignInResponse>(
        '/auth/sessions',
        { username, password }
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
      toast({
        status: 'error',
        description: t('invalidCredentials'),
        position: 'bottom',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginCard title={t('title')} subtitle={t('subtitle')}>
      <form onSubmit={handleSubmit} autoComplete="on" noValidate>
        <VStack spacing={4} align="stretch">
          <FormControl isInvalid={Boolean(usernameError)}>
            <FormLabel>{t('username')}</FormLabel>
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <FaUser color="var(--text-muted)" />
              </InputLeftElement>
              <Input
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (usernameError) setUsernameError('');
                }}
                placeholder={t('usernamePlaceholder')}
                autoComplete="username"
              />
            </InputGroup>
            <FormErrorMessage>{usernameError}</FormErrorMessage>
          </FormControl>

          <FormControl isInvalid={Boolean(passwordError)}>
            <FormLabel>{t('password')}</FormLabel>
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <FaLock color="var(--text-muted)" />
              </InputLeftElement>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                placeholder={t('passwordPlaceholder')}
                autoComplete="current-password"
              />
              <InputRightElement>
                <IconButton
                  variant="ghost"
                  size="sm"
                  aria-label={
                    showPassword ? t('hidePassword') : t('showPassword')
                  }
                  icon={showPassword ? <FaEyeSlash /> : <FaEye />}
                  onClick={() => setShowPassword((prev) => !prev)}
                />
              </InputRightElement>
            </InputGroup>
            <FormErrorMessage>{passwordError}</FormErrorMessage>
          </FormControl>

          <Button
            type="submit"
            colorScheme="brand"
            w="100%"
            isLoading={loading}
          >
            {t('submit')}
          </Button>
        </VStack>
      </form>
    </LoginCard>
  );
}
