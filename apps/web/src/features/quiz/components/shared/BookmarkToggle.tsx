'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Bookmark } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { useToggleBookmark } from '../../hooks';
import { errorMessage } from '../../lib/utils';

interface BookmarkToggleProps {
  quizId: string;
  active: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export function BookmarkToggle({ quizId, active, className, size = 'sm' }: BookmarkToggleProps) {
  const reduce = useReducedMotion();
  const toggle = useToggleBookmark();
  return (
    <motion.button
      type="button"
      aria-pressed={active}
      aria-label={active ? 'Əlfəcindən çıxar' : 'Əlfəcinə əlavə et'}
      title={active ? 'Əlfəcindən çıxar' : 'Əlfəcinə əlavə et'}
      whileTap={reduce ? undefined : { scale: 0.85 }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle.mutate(quizId, {
          onSuccess: (r) => {
            if (r && typeof r.bookmarked === 'boolean')
              toast.success(r.bookmarked ? 'Əlfəcinlərə əlavə edildi' : 'Əlfəcinlərdən çıxarıldı');
          },
          onError: (err) => toast.error(errorMessage(err)),
        });
      }}
      className={cn(
        'relative grid place-items-center rounded-xl border backdrop-blur-md transition-colors',
        size === 'sm' ? 'h-9 w-9' : 'h-11 w-11 rounded-2xl',
        active
          ? 'border-signal/40 bg-signal text-signal-fg'
          : 'border-line-strong bg-bg/50 text-fg hover:bg-bg/70',
        className,
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={active ? 'on' : 'off'}
          initial={reduce ? false : { scale: 0.4, rotate: -20, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 22 }}
        >
          <Bookmark className={size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]'} fill={active ? 'currentColor' : 'none'} />
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
