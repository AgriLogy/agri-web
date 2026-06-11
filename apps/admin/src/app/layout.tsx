// app/layout.tsx (admin)
import './globals.scss';
import { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ColorModeScript } from '@chakra-ui/react';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Providers } from './providers';
import { chakraColorModeConfig } from '@agri/ui';
import { dirFor, type Locale } from '@agri/i18n';

export const metadata: Metadata = {
  title: 'Agrilogy — Admin',
  description: 'Agrilogy administration console.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} dir={dirFor(locale)} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ColorModeScript
          initialColorMode={chakraColorModeConfig.initialColorMode}
        />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AntdRegistry>
            <Providers locale={locale as Locale}>{children}</Providers>
          </AntdRegistry>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
