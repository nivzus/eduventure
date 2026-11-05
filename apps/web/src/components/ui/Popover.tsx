'use client';

import { AnimatePresence, motion } from 'motion/react';
import { cloneElement, isValidElement, useCallback, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useAnchoredPosition, useDismiss, useMounted, type Align, type Side } from './_internal';

export interface PopoverProps {
  /** a single element (button) — receives onClick/aria props */
  trigger: ReactElement<Record<string, unknown>> | ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: Side;
  align?: Align;
  className?: string;
  /** aria-label for the generated trigger wrapper (if trigger is not an element) */
  label?: string;
}

/** Anchored floating panel (portal). Used by notifications, filters, etc. */
export function Popover({ trigger, children, open: openProp, onOpenChange, side = 'bottom', align = 'end', className, label }: PopoverProps) {
  const [inner, setInner] = useState(false);
  const open = openProp ?? inner;
  const setOpen = useCallback(
    (v: boolean) => {
      if (openProp === undefined) setInner(v);
      onOpenChange?.(v);
    },
    [openProp, onOpenChange],
  );
  const close = useCallback(() => setOpen(false), [setOpen]);
  const anchor = useRef<HTMLSpanElement>(null);
  const floating = useRef<HTMLDivElement>(null);
  const mounted = useMounted();
  const pos = useAnchoredPosition(open, anchor, floating, { side, align, offset: 10 });
  useDismiss(open, close, [anchor, floating]);

  const triggerProps = {
    onClick: (e: React.MouseEvent) => {
      if (isValidElement(trigger)) (trigger.props as { onClick?: (e: React.MouseEvent) => void }).onClick?.(e);
      setOpen(!open);
    },
    'aria-haspopup': 'dialog' as const,
    'aria-expanded': open,
  };

  return (
    <>
      <span ref={anchor} className="inline-flex">
        {isValidElement(trigger) ? (
          cloneElement(trigger as ReactElement<Record<string, unknown>>, triggerProps)
        ) : (
          <button type="button" aria-label={label} {...triggerProps}>
            {trigger}
          </button>
        )}
      </span>
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={floating}
                role="dialog"
                data-lenis-prevent
                className={cn('fixed z-[150] w-80 overflow-hidden rounded-3xl border border-line-strong bg-elev shadow-pop', className)}
                style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, transformOrigin: pos?.origin }}
                initial={{ opacity: 0, scale: 0.94, y: -4, filter: 'blur(4px)' }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.97, filter: 'blur(2px)', transition: { duration: 0.14 } }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              >
                {typeof children === 'function' ? children(close) : children}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
