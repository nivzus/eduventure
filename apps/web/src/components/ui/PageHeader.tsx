'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  eyebrow?: ReactNode;
  /** string or node; wrap an accent word in <em> for serif italic */
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** back link above the eyebrow */
  back?: { href: string; label?: string };
  className?: string;
  size?: 'md' | 'lg';
}

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * <PageHeader eyebrow="Məşq · 24 test" title={<>Testlər <em>kataloqu</em></>} description="…" actions={<Button/>} />
 */
export function PageHeader({ eyebrow, title, description, actions, back, className, size = 'md' }: PageHeaderProps) {
  return (
    <header className={cn('relative flex flex-col gap-6 pb-8 md:flex-row md:items-end md:justify-between', className)}>
      <div className="min-w-0 max-w-3xl">
        {back && (
          <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease }}>
            <Link href={back.href} className="group mb-5 inline-flex items-center gap-2 text-sm font-semibold text-muted transition-colors hover:text-fg">
              <ArrowLeft className="size-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
              {back.label ?? 'Geri'}
            </Link>
          </motion.div>
        )}
        {eyebrow && (
          <motion.div
            className="mono-label mb-4 flex items-center gap-2.5"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease }}
          >
            <span className="h-px w-6 bg-signal light:bg-fg" />
            {eyebrow}
          </motion.div>
        )}
        <motion.h1
          className={cn(
            'font-display font-semibold tracking-[-0.03em] [&_em]:serif-accent [&_em]:font-normal [&_em]:tracking-normal',
            size === 'lg' ? 'text-4xl leading-[1.02] sm:text-5xl md:text-6xl' : 'text-3xl leading-[1.05] sm:text-4xl md:text-[2.75rem]',
          )}
          initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.6, ease, delay: 0.05 }}
        >
          {title}
        </motion.h1>
        {description && (
          <motion.p
            className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted sm:text-base"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease, delay: 0.12 }}
          >
            {description}
          </motion.p>
        )}
      </div>
      {actions && (
        <motion.div
          className="flex shrink-0 flex-wrap items-center gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease, delay: 0.18 }}
        >
          {actions}
        </motion.div>
      )}
    </header>
  );
}
