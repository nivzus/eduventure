'use client';

import { Bookmark } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { toast } from '@/components/ui/toast';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useBookmarkSet, useToggleBookmark } from '../../hooks';
import type { ContentType } from '../../types';

interface BookmarkButtonProps {
  type: ContentType;
  id: string;
  className?: string;
  /** "icon" = round 40px button, "chip" = pill with label */
  variant?: 'icon' | 'chip';
  size?: 'sm' | 'md';
}

export function BookmarkButton({ type, id, className, variant = 'icon', size = 'md' }: BookmarkButtonProps) {
  const set = useBookmarkSet();
  const toggle = useToggleBookmark();
  const reduce = useReducedMotion();
  const active = set.has(type, id);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle.mutate(
      { contentType: type, contentId: id },
      {
        onSuccess: (r) => {
          if (r?.bookmarked) toast.success('Əlfəcinlərə əlavə edildi');
        },
        onError: (err) => toast.error(errorMessage(err)),
      },
    );
  };

  const label = active ? 'Əlfəcindən çıxar' : 'Əlfəcinlərə əlavə et';
  const dim = size === 'sm' ? 'size-8' : 'size-10';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      whileTap={reduce ? undefined : { scale: 0.9 }}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center gap-2 border transition-colors',
        variant === 'icon'
          ? cn(dim, 'rounded-full backdrop-blur-md')
          : 'h-10 rounded-full px-4 text-sm font-medium',
        active
          ? 'border-signal/40 bg-signal/15 text-signal light:bg-signal light:text-signal-fg'
          : 'border-line bg-bg/60 text-muted hover:border-line-strong hover:text-fg',
        className,
      )}
    >
      <span className="relative inline-flex">
        <motion.span
          key={active ? 'on' : 'off'}
          initial={reduce ? false : { scale: 0.6, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          className="inline-flex"
        >
          <Bookmark className={size === 'sm' ? 'size-3.5' : 'size-4'} fill={active ? 'currentColor' : 'none'} strokeWidth={2} />
        </motion.span>
        <AnimatePresence>
          {active && !reduce && (
            <motion.span
              key="burst"
              aria-hidden
              initial={{ opacity: 0.8, scale: 0.4 }}
              animate={{ opacity: 0, scale: 2.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-none absolute inset-0 rounded-full border border-current"
            />
          )}
        </AnimatePresence>
      </span>
      {variant === 'chip' && <span>{active ? 'Saxlanılıb' : 'Saxla'}</span>}
    </motion.button>
  );
}
