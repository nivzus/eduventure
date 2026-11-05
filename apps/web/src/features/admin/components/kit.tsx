'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { ArrowLeft, BarChart3, KeyRound, LayoutDashboard, Swords, Users, UsersRound } from 'lucide-react';
import { Skeleton } from '@/components/ui';
import { Highlight, Note } from '@/components/notebook';
import { Mascot } from '@/components/brand/Mascot';
import { NumberTicker } from '@/components/motion';
import { RequireRole, useAuth, hasRole } from '@/lib/auth';
import type { Role } from '@/lib/types';
import { cn } from '@/lib/utils';

const STAFF: Role[] = ['TEACHER', 'ADMIN'];
const ADMIN: Role[] = ['ADMIN'];

const NAV: { href: string; label: string; icon: typeof Users; roles: Role[]; exact?: boolean }[] = [
  { href: '/admin', label: 'Ümumi', icon: LayoutDashboard, roles: STAFF, exact: true },
  { href: '/admin/analytics', label: 'Analitika', icon: BarChart3, roles: STAFF },
  { href: '/admin/groups', label: 'Qruplar', icon: Users, roles: STAFF },
  { href: '/admin/users', label: 'İstifadəçilər', icon: UsersRound, roles: ADMIN },
  { href: '/admin/quests', label: 'Kvestlər', icon: Swords, roles: ADMIN },
  { href: '/admin/permissions', label: 'İcazələr', icon: KeyRound, roles: ADMIN },
];

export function AdminNav() {
  const pathname = usePathname() ?? '';
  const { user } = useAuth();
  const items = NAV.filter((n) => hasRole(user, n.roles));
  if (items.length < 2) return null;
  return (
    <nav aria-label="Admin bölmələri" className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2">
        {items.map((n) => {
          const active = n.exact ? pathname === n.href : pathname === n.href || pathname.startsWith(`${n.href}/`);
          const Icon = n.icon;
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative inline-flex h-10 items-center gap-2 rounded-xl border-2 px-3.5 text-sm font-semibold transition-[transform,box-shadow,border-color]',
                  active
                    ? 'border-ink bg-signal text-signal-fg shadow-stamp-sm'
                    : 'border-line text-muted hover:-translate-y-px hover:border-ink hover:text-fg',
                )}
              >
                <Icon className="size-4" aria-hidden />
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AdminPage({
  note,
  title,
  subtitle,
  actions,
  roles = STAFF,
  back,
  children,
}: {
  note?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  roles?: Role[];
  back?: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <RequireRole roles={roles}>
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
        <AdminNav />
        {back && (
          <Link href={back.href} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg">
            <ArrowLeft className="size-4" /> {back.label}
          </Link>
        )}
        <header className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            {note && <Note className="text-2xl !text-signal">{note}</Note>}
            <h1 className="mt-1 break-words text-4xl sm:text-5xl">
              <Highlight inView={false} delay={0.25}>
                {title}
              </Highlight>
            </h1>
            {subtitle && <p className="hand mt-2 text-xl text-muted sm:text-2xl">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </header>
        <div className="mt-8">{children}</div>
      </div>
    </RequireRole>
  );
}

/** Paper sheet: 2px ink border + hard stamp shadow. */
export function Sheet({
  title,
  note,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  note?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn('min-w-0 rounded-3xl border-2 border-ink bg-elev p-4 shadow-stamp sm:p-6', className)}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="font-display text-xl font-bold leading-tight">{title}</h2>}
            {note && <p className="mono-label mt-0.5">{note}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function Kpi({
  label,
  value,
  suffix,
  decimals = 0,
  hint,
  tone = 'paper',
  index = 0,
  icon,
}: {
  label: ReactNode;
  value: number | null | undefined;
  suffix?: string;
  decimals?: number;
  hint?: ReactNode;
  tone?: 'paper' | 'signal';
  index?: number;
  icon?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.05 }}
      className={cn(
        'relative min-w-0 rounded-2xl border-2 border-ink p-4 shadow-stamp-sm',
        tone === 'signal' ? 'bg-signal text-signal-fg' : 'bg-elev',
        index % 2 ? 'rotate-[0.6deg]' : '-rotate-[0.5deg]',
      )}
    >
      <div className={cn('mono-label flex items-center gap-1.5', tone === 'signal' && '!text-signal-fg/80')}>
        {icon}
        {label}
      </div>
      <div className="mt-1 font-display text-3xl font-extrabold tabular sm:text-4xl">
        {value == null ? '—' : <NumberTicker value={value} decimals={decimals} suffix={suffix} />}
      </div>
      {hint && <div className={cn('mt-0.5 text-xs', tone === 'signal' ? 'text-signal-fg/75' : 'text-subtle')}>{hint}</div>}
    </motion.div>
  );
}

/** Inline percent bar for tables. `value` 0–100. */
export function PctBar({ value, pass }: { value: number | null | undefined; pass?: number }) {
  if (value == null) return <span className="text-subtle">—</span>;
  const v = Math.max(0, Math.min(100, value));
  const tone = pass != null ? (v >= pass ? 'var(--moss)' : 'var(--ember)') : 'var(--signal)';
  return (
    <span className="inline-flex min-w-[110px] items-center gap-2">
      <span className="relative h-2.5 w-16 overflow-hidden rounded-full border-[1.5px] border-ink bg-sunken">
        <span className="absolute inset-y-0 left-0" style={{ width: `${v}%`, background: tone }} />
      </span>
      <span className="font-mono text-xs tabular">{Math.round(v)}%</span>
    </span>
  );
}

export function SheetSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-12 rounded-2xl" />
      ))}
    </div>
  );
}

export function EmptyNote({ message, hint, mode = 'static' }: { message: string; hint?: ReactNode; mode?: 'static' | 'sad' }) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <Mascot mode={mode} size={96} message={message} />
      {hint && <p className="mt-3 max-w-sm text-sm text-muted">{hint}</p>}
    </div>
  );
}

/** Small tag telling the viewer numbers were computed in the browser (stats endpoint missing). */
export function DerivedTag({ show }: { show?: boolean }) {
  if (!show) return null;
  return (
    <span title="Statistika xidməti cavab vermədi — rəqəmlər cəhdlərdən hesablanıb" className="hand rounded-md border border-dashed border-line-strong px-2 py-0.5 text-base text-subtle">
      yerli hesablama
    </span>
  );
}

export const dayLabelShort = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(+d)) return iso;
  return d.toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' }).replace('.', '');
};
