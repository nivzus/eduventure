'use client';

import { CloudOff, RotateCcw, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

/** Compact empty state for use inside bento panels. */
export function InlineEmpty({ icon: Icon, title, hint, action, className }: { icon?: LucideIcon; title: string; hint?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line px-4 py-8 text-center', className)}>
      {Icon && (
        <span className="mb-1 grid size-10 place-items-center rounded-full border border-line bg-sunken text-subtle">
          <Icon className="size-[18px]" />
        </span>
      )}
      <p className="text-sm font-semibold">{title}</p>
      {hint && <p className="max-w-[34ch] text-xs text-muted">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Error panel with retry; `compact` for inside cards. */
export function ErrorState({ error, onRetry, compact, title = 'Məlumatı yükləmək alınmadı', className }: { error?: unknown; onRetry?: () => void; compact?: boolean; title?: string; className?: string }) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-center',
        compact ? 'rounded-2xl border border-dashed border-danger/30 px-4 py-6' : 'min-h-[40vh] px-6 py-16',
        className,
      )}
    >
      <span className={cn('grid place-items-center rounded-full border border-danger/30 bg-danger/10 text-danger', compact ? 'size-10' : 'size-14')}>
        <CloudOff className={compact ? 'size-[18px]' : 'size-6'} />
      </span>
      <div className="space-y-1">
        <p className={cn('font-semibold', compact ? 'text-sm' : 'font-display text-xl')}>{title}</p>
        <p className="mx-auto max-w-[44ch] text-xs text-muted sm:text-sm">{errorMessage(error)}</p>
      </div>
      {onRetry && (
        <Button size="sm" variant="secondary" leftIcon={<RotateCcw />} onClick={onRetry}>
          Yenidən cəhd et
        </Button>
      )}
    </div>
  );
}

/** Lightweight shimmer block (kept local so panels don't depend on kit internals). */
export function Shimmer({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn('relative block overflow-hidden rounded-xl bg-fg/[0.06]', className)}>
      <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-fg/[0.07] to-transparent" />
    </span>
  );
}
