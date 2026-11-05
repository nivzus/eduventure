'use client';

import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PanelLeftClose, PanelLeftOpen, Flame, Mountain } from 'lucide-react';
import { useMemo } from 'react';
import { cn, formatNumber } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useMeSummary } from '@/lib/hooks';
import { Tooltip } from '@/components/ui/Tooltip';
import { LogoMark, Wordmark } from './Logo';
import { activeHref, navForRole } from './nav';

export const RAIL_W = { collapsed: 72, expanded: 248 };

export function Rail({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname() ?? '';
  const { user } = useAuth();
  const groups = navForRole(user?.role);
  const all = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const current = activeHref(pathname, all);

  return (
    <motion.aside
      aria-label="Əsas naviqasiya"
      className="fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line bg-bg/80 backdrop-blur-xl lg:flex"
      initial={false}
      animate={{ width: collapsed ? RAIL_W.collapsed : RAIL_W.expanded }}
      transition={{ type: 'spring', stiffness: 380, damping: 36 }}
    >
      {/* brand */}
      <div className={cn('flex h-16 shrink-0 items-center border-b border-line', collapsed ? 'justify-center px-0' : 'justify-between pl-5 pr-3')}>
        <Link href="/dashboard" className="group flex items-center gap-2.5" aria-label="İdarə paneli">
          <LogoMark className="transition-transform duration-500 ease-out-expo group-hover:-rotate-6" />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6, transition: { duration: 0.1 } }}>
                <Wordmark />
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Paneli yığ"
            className="inline-flex size-8 items-center justify-center rounded-xl text-subtle transition hover:bg-fg/[0.06] hover:text-fg"
          >
            <PanelLeftClose className="size-[18px]" />
          </button>
        )}
      </div>

      {/* nav */}
      <nav className="scrollbar-none flex-1 overflow-y-auto overflow-x-hidden px-3 py-4" data-lenis-prevent>
        {groups.map((g, gi) => (
          <div key={g.id} className={cn(gi > 0 && 'mt-5')}>
            <div className={cn('mb-1.5 flex h-5 items-center', collapsed ? 'justify-center' : 'px-3')}>
              {collapsed ? (
                gi > 0 ? <span className="h-px w-5 bg-line-strong" /> : null
              ) : (
                <span className="mono-label !text-[15px]">{g.label}</span>
              )}
            </div>
            <ul className="flex flex-col gap-0.5">
              {g.items.map((it) => {
                const active = current === it.href;
                const Icon = it.icon;
                const link = (
                  <Link
                    href={it.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group relative flex h-10 items-center rounded-xl text-sm font-semibold outline-offset-[-2px] transition-colors duration-200',
                      collapsed ? 'w-12 justify-center' : 'gap-3 px-3',
                      active ? 'text-fg' : 'text-muted hover:text-fg',
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="rail-active"
                        className="absolute inset-0 rounded-xl border border-line bg-fg/[0.06]"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      >
                        <span className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-signal light:bg-ember" />
                      </motion.span>
                    )}
                    <Icon
                      className={cn(
                        'relative size-[18px] shrink-0 transition-transform duration-300 ease-out-expo group-hover:scale-110',
                        active && 'text-signal light:text-ember',
                      )}
                      strokeWidth={active ? 2.2 : 1.9}
                    />
                    {!collapsed && <span className="relative truncate">{it.label}</span>}
                  </Link>
                );
                return (
                  <li key={it.href} className={cn(collapsed && 'flex justify-center')}>
                    {collapsed ? (
                      <Tooltip content={it.label} side="right" delay={80}>
                        {link}
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* altimeter */}
      <RailAltimeter collapsed={collapsed} />

      {collapsed && (
        <div className="flex justify-center border-t border-line py-3">
          <Tooltip content="Paneli aç" side="right" delay={80}>
            <button
              type="button"
              onClick={onToggle}
              aria-label="Paneli aç"
              className="inline-flex size-10 items-center justify-center rounded-xl text-subtle transition hover:bg-fg/[0.06] hover:text-fg"
            >
              <PanelLeftOpen className="size-[18px]" />
            </button>
          </Tooltip>
        </div>
      )}
    </motion.aside>
  );
}

function RailAltimeter({ collapsed }: { collapsed: boolean }) {
  const { user } = useAuth();
  const { data } = useMeSummary();
  const level = data?.level ?? user?.level ?? 1;
  const xp = data?.xp ?? user?.xp ?? 0;
  const progress = Math.max(0, Math.min(1, data?.levelProgress ?? 0));
  const streak = data?.streak ?? user?.streak ?? 0;
  const toNext = data?.nextLevelXp ? Math.max(0, data.nextLevelXp - xp) : null;

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 border-t border-line py-4">
        <Tooltip content={`Səviyyə ${level} · ${formatNumber(xp)} XP`} side="right" delay={80}>
          <div className="relative flex h-16 w-2 overflow-hidden rounded-full bg-fg/[0.08]">
            <motion.div
              className="absolute inset-x-0 bottom-0 rounded-full bg-aurora"
              initial={{ height: 0 }}
              animate={{ height: `${progress * 100}%` }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </Tooltip>
        <span className="font-display text-xs font-semibold text-aurora">L{level}</span>
      </div>
    );
  }

  return (
    <div className="m-3 rounded-2xl border border-line bg-elev/70 p-3.5">
      <div className="flex items-center justify-between">
        <span className="mono-label flex items-center gap-1.5 !text-[15px]">
          <Mountain className="size-3.5 text-aurora" /> Hündürlük
        </span>
        <span className="flex items-center gap-1 font-mono text-[11px] font-semibold text-ember">
          <Flame className={cn('size-3.5', streak > 0 && 'animate-flicker')} />
          {streak}
        </span>
      </div>
      <div className="mt-2.5 flex items-baseline gap-2">
        <span className="font-display text-2xl font-semibold tracking-tight">{level}</span>
        <span className="text-xs text-muted">səviyyə</span>
        <span className="ml-auto font-mono text-[11px] tabular-nums text-subtle">{formatNumber(xp)} XP</span>
      </div>
      <div className="relative mt-2.5 h-1.5 overflow-hidden rounded-full bg-fg/[0.08]">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-aurora to-glacier"
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      {toNext !== null && <p className="mt-2 text-[11px] text-subtle">Növbəti zirvəyə {formatNumber(toNext)} XP</p>}
    </div>
  );
}
