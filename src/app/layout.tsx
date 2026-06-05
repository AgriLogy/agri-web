// app/layout.tsx
import './globals.scss';
import { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ColorModeScript } from '@chakra-ui/react';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Providers } from './providers';
import { chakraColorModeConfig } from './colorModeConfig';
import { dirFor, type Locale } from '../i18n/config';

export const metadata: Metadata = {
  title: 'Agrilogy',
  description:
    'Agrilogy is an innovative agriculture automation solution designed to enhance productivity, sustainability, and efficiency in farming. By utilizing smart technology and data-driven insights, Agrilogy optimizes irrigation, crop monitoring, and supply chain management, empowering farmers to achieve higher yields and reduce costs while promoting eco-friendly practices.',
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
