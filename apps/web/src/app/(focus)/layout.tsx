'use client';

import type { ReactNode } from 'react';
import { AuthGuard } from '@/lib/auth';
import { Splash } from '@/components/shell';

export default function FocusLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard fallback={<Splash />}>
      <main className="relative min-h-dvh">{children}</main>
    </AuthGuard>
  );
}
