'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Drawer } from '@/components/ui/Modal';
import { activeHref, MOBILE_TABS, navForRole } from './nav';
import { ThemeToggle } from './ThemeToggle';

export function MobileTabBar() {
  const pathname = usePathname() ?? '';
  const [more, setMore] = useState(false);
  const { user } = useAuth();
  const groups = navForRole(user?.role);
  const current = activeHref(pathname, MOBILE_TABS);
  const moreActive = !current;

  return (
    <>
      <nav
        aria-label="Mobil naviqasiya"
        className="glass fixed inset-x-0 bottom-0 z-40 border-t border-line pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-2">
          {MOBILE_TABS.map((t) => {
            const active = current === t.href;
            const Icon = t.icon;
            return (
              <li key={t.href} className="flex-1">
                <Link href={t.href} aria-current={active ? 'page' : undefined} className="relative flex h-full flex-col items-center justify-center gap-1">
                  {active && (
                    <motion.span layoutId="tab-active" className="absolute top-0 h-[3px] w-8 rounded-b-full bg-signal light:bg-ember" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />
                  )}
                  <Icon className={cn('size-5 transition-colors', active ? 'text-fg' : 'text-subtle')} strokeWidth={active ? 2.3 : 1.9} />
                  <span className={cn('text-[10.5px] font-semibold', active ? 'text-fg' : 'text-subtle')}>{t.label}</span>
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button type="button" onClick={() => setMore(true)} className="relative flex h-full w-full flex-col items-center justify-center gap-1">
              {moreActive && <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-signal light:bg-ember" />}
              <LayoutGrid className={cn('size-5', moreActive ? 'text-fg' : 'text-subtle')} />
              <span className={cn('text-[10.5px] font-semibold', moreActive ? 'text-fg' : 'text-subtle')}>Daha</span>
            </button>
          </li>
        </ul>
      </nav>

      <Drawer open={more} onClose={() => setMore(false)} side="bottom" title="Bütün bölmələr">
        <div className="flex flex-col gap-6 pb-4">
          {groups.map((g) => (
            <div key={g.id}>
              <p className="mono-label mb-2.5">{g.label}</p>
              <div className="grid grid-cols-3 gap-2">
                {g.items.map((it) => {
                  const Icon = it.icon;
                  const active = activeHref(pathname, [it]) === it.href;
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      onClick={() => setMore(false)}
                      className={cn(
                        'flex flex-col items-start gap-2 rounded-2xl border p-3 text-[13px] font-semibold transition',
                        active ? 'border-signal/50 bg-signal/10 text-fg light:border-fg/40 light:bg-fg/5' : 'border-line bg-surface text-muted',
                      )}
                    >
                      <Icon className="size-[18px]" />
                      <span className="leading-tight">{it.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-2xl border border-line bg-surface p-3">
            <span className="text-sm font-semibold">Tema</span>
            <ThemeToggle />
          </div>
        </div>
      </Drawer>
    </>
  );
}
