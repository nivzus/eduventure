'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Search } from 'lucide-react';
import { AuthGuard } from '@/lib/auth';
import { PageTransition } from '@/components/motion/PageTransition';
import { IconButton } from '@/components/ui/IconButton';
import { Logo } from './Logo';
import { Rail, RAIL_W } from './Rail';
import { CommandPalette, CommandTrigger, openCommandPalette } from './CommandPalette';
import { NotificationsPopover } from './NotificationsPopover';
import { StreakChip, XpChip } from './StatusChips';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';
import { MobileTabBar } from './MobileNav';
import { Splash } from './Splash';

const RAIL_KEY = 'ev-rail-collapsed';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AuthGuard fallback={<Splash />}>
      <ShellFrame>{children}</ShellFrame>
    </AuthGuard>
  );
}

function ShellFrame({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(RAIL_KEY) === '1');
    } catch {}
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(RAIL_KEY, c ? '0' : '1');
      } catch {}
      return !c;
    });
  };

  const railW = collapsed ? RAIL_W.collapsed : RAIL_W.expanded;

  return (
    <div className="relative min-h-dvh" style={{ ['--rail-w' as string]: `${railW}px` }}>
      <a href="#main" className="sr-only fixed left-4 top-4 z-[500] rounded-xl bg-signal px-4 py-2 font-semibold text-signal-fg focus:not-sr-only">
        Məzmuna keç
      </a>
      <Rail collapsed={collapsed} onToggle={toggle} />

      <motion.div
        className="flex min-h-dvh flex-col lg:pl-[var(--rail-w)]"
        initial={false}
        animate={{ ['--rail-w' as string]: `${railW}px` }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
      >
        <header className="glass sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line px-4 sm:px-6">
          <div className="lg:hidden">
            <Logo href="/dashboard" />
          </div>
          <div className="hidden flex-1 lg:block">
            <CommandTrigger />
          </div>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              <StreakChip />
              <XpChip />
            </div>
            <span className="mx-1 hidden h-6 w-px bg-line sm:block" />
            <IconButton label="Axtar" icon={<Search />} className="lg:hidden" onClick={openCommandPalette} />
            <NotificationsPopover />
            <ThemeToggle className="hidden sm:inline-flex" />
            <div className="pl-1">
              <UserMenu />
            </div>
          </div>
        </header>

        <main id="main" className="relative flex-1 pb-28 lg:pb-12">
          <PageTransition className="mx-auto w-full max-w-[1400px] px-4 pt-6 sm:px-6 sm:pt-8 lg:px-10 lg:pt-10">{children}</PageTransition>
        </main>
      </motion.div>

      <MobileTabBar />
      <CommandPalette />
    </div>
  );
}
