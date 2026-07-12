'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Divider,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Heading,
  Input,
  InputGroup,
  InputRightElement,
  SimpleGrid,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import axios from 'axios';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import { userProfileApi } from '@agri/api-client/userProfileApi';

// Basic RFC-5322-ish email shape; deliberately permissive, the API is the
// authority. Empty is allowed here (required-ness is enforced separately).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// International phone: optional leading +, 8–15 digits (E.164 friendly).
const PHONE_RE = /^\+?[0-9]{8,15}$/;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Self-service account settings: the caller edits their own name, email and
 * phone number, and can change their password via a secure current-password
 * confirmation flow. Distinct from the "Contact" tab, which only tunes the
 * default alert-delivery channel.
 */
const ProfileSection = () => {
  const t = useTranslations();
  const toast = useToast();
  const { mutedTextColor } = useColorModeStyles();

  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingIdentity, setSavingIdentity] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [submittedIdentity, setSubmittedIdentity] = useState(false);
  const [submittedPassword, setSubmittedPassword] = useState(false);

  useEffect(() => {
    userProfileApi
      .get()
      .then((p) => {
        setUsername(p.username || '');
        setFirstName(p.first_name || '');
        setLastName(p.last_name || '');
        setEmail(p.email || '');
        setPhone(p.phone_number || '');
      })
      .catch(() => {
        toast({
          title: t('settings.profile.loadFailed'),
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      })
      .finally(() => setLoading(false));
  }, [t, toast]);

  const emailError = useMemo(() => {
    if (!email.trim()) return t('settings.profile.errEmailRequired');
    if (!EMAIL_RE.test(email.trim()))
      return t('settings.profile.errEmailInvalid');
    return '';
  }, [email, t]);

  const phoneError = useMemo(() => {
    // Phone is optional, but if present it must be a valid international number.
    if (phone.trim() && !PHONE_RE.test(phone.trim()))
      return t('settings.profile.errPhoneInvalid');
    return '';
  }, [phone, t]);

  const newPasswordError = useMemo(() => {
    if (!newPassword) return t('settings.profile.errPasswordRequired');
    if (newPassword.length < MIN_PASSWORD_LENGTH)
      return t('settings.profile.errPasswordTooShort', {
        min: MIN_PASSWORD_LENGTH,
      });
    return '';
  }, [newPassword, t]);

  const confirmPasswordError = useMemo(() => {
    if (!confirmPassword) return t('settings.profile.errConfirmRequired');
    if (confirmPassword !== newPassword)
      return t('settings.profile.errPasswordMismatch');
    return '';
  }, [confirmPassword, newPassword, t]);

  const currentPasswordError = useMemo(() => {
    if (!currentPassword) return t('settings.profile.errCurrentRequired');
    return '';
  }, [currentPassword, t]);

  const saveIdentity = async () => {
    setSubmittedIdentity(true);
    if (emailError || phoneError) return;
    setSavingIdentity(true);
    try {
      const updated = await userProfileApi.update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone_number: phone.trim(),
      });
      setFirstName(updated.first_name || '');
      setLastName(updated.last_name || '');
      setEmail(updated.email || '');
      setPhone(updated.phone_number || '');
      toast({
        title: t('settings.profile.identitySaved'),
        status: 'success',
        duration: 2500,
      });
    } catch (err) {
      toast({
        title: t('settings.profile.identitySaveFailed'),
        description: extractApiMessage(err),
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setSavingIdentity(false);
    }
  };

  const savePassword = async () => {
    setSubmittedPassword(true);
    if (currentPasswordError || newPasswordError || confirmPasswordError)
      return;
    setSavingPassword(true);
    try {
      await userProfileApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSubmittedPassword(false);
      toast({
        title: t('settings.profile.passwordSaved'),
        status: 'success',
        duration: 2500,
      });
    } catch (err) {
      toast({
        title: t('settings.profile.passwordSaveFailed'),
        description: extractApiMessage(err),
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return <Text fontSize="sm">{t('settings.profile.loading')}</Text>;
  }

  return (
    <VStack align="stretch" spacing={8} maxW="640px">
      {/* --- Identity: name, email, phone --- */}
      <Box>
        <Heading as="h3" size="sm" mb={1}>
          {t('settings.profile.identityTitle')}
        </Heading>
        <Text fontSize="sm" color={mutedTextColor} mb={4}>
          {t('settings.profile.identityIntro')}
        </Text>

        <VStack align="stretch" spacing={4}>
          <FormControl>
            <FormLabel>{t('settings.profile.usernameLabel')}</FormLabel>
            <Input value={username} isReadOnly isDisabled />
            <FormHelperText>
              {t('settings.profile.usernameHelp')}
            </FormHelperText>
          </FormControl>

          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
            <FormControl>
              <FormLabel>{t('settings.profile.firstNameLabel')}</FormLabel>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
              />
            </FormControl>
            <FormControl>
              <FormLabel>{t('settings.profile.lastNameLabel')}</FormLabel>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
              />
            </FormControl>
          </SimpleGrid>

          <FormControl isInvalid={submittedIdentity && !!emailError}>
            <FormLabel>{t('settings.profile.emailLabel')}</FormLabel>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <FormErrorMessage>{emailError}</FormErrorMessage>
          </FormControl>

          <FormControl isInvalid={submittedIdentity && !!phoneError}>
            <FormLabel>{t('settings.profile.phoneLabel')}</FormLabel>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+212600000000"
              autoComplete="tel"
            />
            {submittedIdentity && phoneError ? (
              <FormErrorMessage>{phoneError}</FormErrorMessage>
            ) : (
              <FormHelperText>{t('settings.profile.phoneHelp')}</FormHelperText>
            )}
          </FormControl>

          <Button
            size="sm"
            colorScheme="brand"
            alignSelf="flex-start"
            isLoading={savingIdentity}
            onClick={() => void saveIdentity()}
          >
            {t('settings.profile.saveIdentity')}
          </Button>
        </VStack>
      </Box>

      <Divider />

      {/* --- Password change: secure current-password confirmation --- */}
      <Box>
        <Heading as="h3" size="sm" mb={1}>
          {t('settings.profile.passwordTitle')}
        </Heading>
        <Text fontSize="sm" color={mutedTextColor} mb={4}>
          {t('settings.profile.passwordIntro')}
        </Text>

        <VStack align="stretch" spacing={4}>
          <FormControl isInvalid={submittedPassword && !!currentPasswordError}>
            <FormLabel>{t('settings.profile.currentPasswordLabel')}</FormLabel>
            <Input
              type={showPasswords ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
            <FormErrorMessage>{currentPasswordError}</FormErrorMessage>
          </FormControl>

          <FormControl isInvalid={submittedPassword && !!newPasswordError}>
            <FormLabel>{t('settings.profile.newPasswordLabel')}</FormLabel>
            <InputGroup>
              <Input
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
              <InputRightElement width="4.5rem">
                <Button
                  h="1.75rem"
                  size="xs"
                  variant="ghost"
                  onClick={() => setShowPasswords((s) => !s)}
                >
                  {showPasswords
                    ? t('settings.profile.hide')
                    : t('settings.profile.show')}
                </Button>
              </InputRightElement>
            </InputGroup>
            {submittedPassword && newPasswordError ? (
              <FormErrorMessage>{newPasswordError}</FormErrorMessage>
            ) : (
              <FormHelperText>
                {t('settings.profile.passwordHelp', {
                  min: MIN_PASSWORD_LENGTH,
                })}
              </FormHelperText>
            )}
          </FormControl>

          <FormControl isInvalid={submittedPassword && !!confirmPasswordError}>
            <FormLabel>{t('settings.profile.confirmPasswordLabel')}</FormLabel>
            <Input
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
            <FormErrorMessage>{confirmPasswordError}</FormErrorMessage>
          </FormControl>

          <Button
            size="sm"
            colorScheme="brand"
            alignSelf="flex-start"
            isLoading={savingPassword}
            onClick={() => void savePassword()}
          >
            {t('settings.profile.changePassword')}
          </Button>
        </VStack>
      </Box>
    </VStack>
  );
};

/** Pull a human-readable message out of a Django/DRF-style error envelope. */
function extractApiMessage(err: unknown): string | undefined {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | Record<string, unknown>
      | string
      | undefined;
    if (typeof data === 'string') return data;
    if (data && typeof data === 'object') {
      const detail = data.detail ?? data.error;
      if (typeof detail === 'string') return detail;
      // First field-level error (e.g. { current_password: ["Wrong password."] }).
      const first = Object.values(data)[0];
      if (Array.isArray(first) && typeof first[0] === 'string') return first[0];
      if (typeof first === 'string') return first;
    }
  }
  return undefined;
}

export default ProfileSection;
