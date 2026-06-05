'use client';

import { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button, Menu, MenuButton, MenuItem, MenuList } from '@chakra-ui/react';
import { setUserLocale } from '../../i18n/locale';
import { localeNames, locales, type Locale } from '../../i18n/config';

/**
 * Locale switcher. Persists the choice via the `setUserLocale` server action
 * (writes the NEXT_LOCALE cookie) then refreshes so the server re-renders the
 * tree with the new messages and text direction.
 */
export default function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function change(next: Locale) {
    if (next === locale) return;
    startTransition(async () => {
      await setUserLocale(next);
      router.refresh();
    });
  }

  return (
    <Menu>
      <MenuButton
        as={Button}
        variant="ghost"
        size="sm"
        isLoading={isPending}
        aria-label={localeNames[locale]}
      >
        {locale.toUpperCase()}
      </MenuButton>
      <MenuList minW="10rem">
        {locales.map((l) => (
          <MenuItem
            key={l}
            onClick={() => change(l)}
            fontWeight={l === locale ? 'bold' : 'normal'}
          >
            {localeNames[l]}
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  );
}
