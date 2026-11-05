import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell';
import { MascotPeek } from '@/components/brand/Mascot';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      {children}
      <MascotPeek />
    </AppShell>
  );
}
