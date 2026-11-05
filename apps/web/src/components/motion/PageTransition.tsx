'use client';

import { motion } from 'motion/react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Fade/blur-in on every route change. Used by the app shell around page content. */
export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  const pathname = usePathname();
  return (
    <motion.div
      key={pathname}
      className={cn('min-w-0', className)}
      initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
