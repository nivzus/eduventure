import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@fontsource-variable/unbounded';
import '@fontsource-variable/manrope';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
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
    { media: '(prefers-color-scheme: dark)', color: '#0b0b10' },
    { media: '(prefers-color-scheme: light)', color: '#f3eee3' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="az" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh bg-bg font-sans text-fg antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
