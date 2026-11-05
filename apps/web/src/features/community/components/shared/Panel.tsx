'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';

interface PanelProps {
  eyebrow?: ReactNode;
  title?: ReactNode;
  /** serif-italic accent word appended to the title */
  accent?: ReactNode;
  action?: { href: string; label: string } | ReactNode;
  className?: string;
  bodyClassName?: string;
  children?: ReactNode;
  interactive?: boolean;
  glow?: string;
  decor?: ReactNode;
}

function isLinkAction(a: PanelProps['action']): a is { href: string; label: string } {
  return !!a && typeof a === 'object' && 'href' in (a as object) && 'label' in (a as object);
}

/** Bento tile: mono eyebrow + display title + optional corner link. */
export function Panel({ eyebrow, title, accent, action, className, bodyClassName, children, interactive, glow, decor }: PanelProps) {
  return (
    <Card padded={false} interactive={interactive} glow={glow} className={cn('flex h-full flex-col overflow-hidden', className)}>
      {decor}
      {(eyebrow || title || action) && (
        <header className="relative z-[1] flex items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
          <div className="min-w-0">
            {eyebrow && <span className="mono-label">{eyebrow}</span>}
            {title && (
              <h2 className="mt-1.5 text-lg font-semibold leading-tight sm:text-xl">
                {title}
                {accent && <span className="accent ml-1.5 text-[1.3em] font-normal text-muted">{accent}</span>}
              </h2>
            )}
          </div>
          {isLinkAction(action) ? (
            <Link
              href={action.href}
              className="group/act -mr-1 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-subtle transition-colors hover:text-fg"
            >
              {action.label}
              <ArrowUpRight className="size-3.5 transition-transform duration-300 ease-out-expo group-hover/act:-translate-y-0.5 group-hover/act:translate-x-0.5" />
            </Link>
          ) : (
            action
          )}
        </header>
      )}
      <div className={cn('relative z-[1] flex-1 px-5 pb-5 pt-4 sm:px-6 sm:pb-6', bodyClassName)}>{children}</div>
    </Card>
  );
}
