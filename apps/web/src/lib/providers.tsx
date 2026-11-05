'use client';

import type { ReactNode } from 'react';
import { MotionConfig } from 'motion/react';
import { QueryProvider } from './query';
import { ThemeProvider } from './theme';
import { Toaster } from '@/components/ui/toast';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <MotionConfig reducedMotion="user">
          {children}
          <Toaster />
        </MotionConfig>
      </QueryProvider>
    </ThemeProvider>
  );
}
