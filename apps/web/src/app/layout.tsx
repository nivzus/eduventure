import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@fontsource-variable/baloo-2';
import '@fontsource-variable/quicksand';
import '@fontsource-variable/nunito';
import '@fontsource-variable/nunito/wght-italic.css';
import '@fontsource-variable/caveat';
import '@fontsource-variable/jetbrains-mono';
import './globals.css';
import { Providers } from '@/lib/providers';
import { themeInitScript } from '@/lib/theme';

export const metadata: Metadata = {
  title: { default: 'Eduventure — İngilis dilini birlikdə öyrənək', template: '%s · Eduventure' },
  description: 'Testlər, kurslar, məqalələr və fləşkartlarla ingilis dilini macəra kimi öyrən.',
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbf6ec' },
    { media: '(prefers-color-scheme: dark)', color: '#1b1713' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="az" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh bg-bg font-sans text-fg antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
