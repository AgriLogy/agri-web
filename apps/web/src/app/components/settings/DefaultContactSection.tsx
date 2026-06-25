'use client';

import { useEffect, useState } from 'react';
import {
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Select,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import {
  userProfileApi,
  type NotificationLanguage,
} from '@agri/api-client/userProfileApi';

/**
 * Self-service editor for the user's default alert contact (phone + email).
 * This is the number/address every alert and zone notification falls back to
 * when no per-alert override is set.
 */
const DefaultContactSection = () => {
  const t = useTranslations();
  const toast = useToast();
  const { mutedTextColor } = useColorModeStyles();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [language, setLanguage] = useState<NotificationLanguage>('fr');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    userProfileApi
      .get()
      .then((p) => {
        setPhone(p.phone_number || '');
        setEmail(p.email || '');
        setLanguage(p.preferred_language === 'ar' ? 'ar' : 'fr');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await userProfileApi.update({
        phone_number: phone.trim(),
        email: email.trim(),
        preferred_language: language,
      });
      setPhone(updated.phone_number || '');
      setEmail(updated.email || '');
      setLanguage(updated.preferred_language === 'ar' ? 'ar' : 'fr');
      toast({
        title: t('settings.contact.saved'),
        status: 'success',
        duration: 2000,
      });
    } catch {
      toast({
        title: t('settings.contact.saveFailed'),
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Text fontSize="sm">{t('settings.contact.loading')}</Text>;
  }

  return (
    <VStack align="stretch" spacing={4} maxW="480px">
      <Text fontSize="sm" color={mutedTextColor}>
        {t('settings.contact.intro')}
      </Text>
      <FormControl>
        <FormLabel>{t('settings.contact.phoneLabel')}</FormLabel>
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+212600000000"
        />
        <FormHelperText>{t('settings.contact.phoneHelp')}</FormHelperText>
      </FormControl>
      <FormControl>
        <FormLabel>{t('settings.contact.emailLabel')}</FormLabel>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormControl>
      <FormControl>
        <FormLabel>{t('settings.contact.notifLanguageLabel')}</FormLabel>
        <Select
          value={language}
          onChange={(e) => setLanguage(e.target.value === 'ar' ? 'ar' : 'fr')}
          maxW="240px"
        >
          <option value="fr">Français</option>
          <option value="ar">العربية</option>
        </Select>
        <FormHelperText>
          {t('settings.contact.notifLanguageHelp')}
        </FormHelperText>
      </FormControl>
      <Button
        size="sm"
        colorScheme="brand"
        alignSelf="flex-start"
        isLoading={saving}
        onClick={() => void save()}
      >
        {t('settings.contact.saveButton')}
      </Button>
    </VStack>
  );
};

export default DefaultContactSection;
