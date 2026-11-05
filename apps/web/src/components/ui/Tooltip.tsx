'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useAnchoredPosition, useMounted, type Side } from './_internal';

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: Side;
  /** ms before showing (default 250) */
  delay?: number;
  disabled?: boolean;
  className?: string;
}

/** <Tooltip content="Bildirişlər" side="bottom"><IconButton …/></Tooltip> */
export function Tooltip({ content, children, side = 'top', delay = 250, disabled, className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLSpanElement>(null);
  const floating = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const id = useId();
  const mounted = useMounted();
  const pos = useAnchoredPosition(open, anchor, floating, { side, align: 'center', offset: 8 });

  const show = () => {
    if (disabled) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    setOpen(false);
  };

  return (
    <span
      ref={anchor}
      className="inline-flex"
      onPointerEnter={(e) => e.pointerType === 'mouse' && show()}
      onPointerLeave={hide}
      onFocus={show}
      onBlur={hide}
      aria-describedby={open ? id : undefined}
    >
      {children}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={floating}
                id={id}
                role="tooltip"
                className={cn(
                  'pointer-events-none fixed z-[200] max-w-xs rounded-xl border border-line-strong bg-surface px-2.5 py-1.5 text-xs font-semibold text-fg shadow-pop',
                  className,
                )}
                style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, transformOrigin: pos?.origin }}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.1 } }}
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              >
                {content}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </span>
  );
}
