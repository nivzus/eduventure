'use client';

import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useDialogBehavior, useMounted } from './_internal';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  /** click on backdrop closes (default true) */
  dismissible?: boolean;
  hideClose?: boolean;
}

const widths = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl', full: 'sm:max-w-[min(1200px,95vw)]' };

/**
 * <Modal open={open} onClose={() => setOpen(false)} title="Testi sil?" description="…" footer={<Button>…</Button>}>…</Modal>
 * Bottom sheet on mobile, centered dialog on ≥sm.
 */
export function Modal({ open, onClose, title, description, children, footer, size = 'md', className, dismissible = true, hideClose }: ModalProps) {
  const mounted = useMounted();
  const ref = useRef<HTMLDivElement>(null);
  const tid = useId();
  const did = useId();
  useDialogBehavior(open, onClose, ref);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6" data-lenis-prevent>
          <motion.div
            className="absolute inset-0 bg-[#05050a]/70 backdrop-blur-md light:bg-[#2a2418]/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            onClick={dismissible ? onClose : undefined}
          />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? tid : undefined}
            aria-describedby={description ? did : undefined}
            tabIndex={-1}
            className={cn(
              'relative z-[1] flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-line-strong bg-elev shadow-pop outline-none sm:rounded-3xl',
              widths[size],
              className,
            )}
            initial={{ opacity: 0, y: 40, scale: 0.97, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 24, scale: 0.98, filter: 'blur(4px)', transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-fg/15 sm:hidden" />
            {(title || !hideClose) && (
              <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-5 sm:pt-6">
                <div className="min-w-0">
                  {title && (
                    <h2 id={tid} className="font-display text-lg font-semibold tracking-tight sm:text-xl">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p id={did} className="mt-1.5 text-sm text-muted">
                      {description}
                    </p>
                  )}
                </div>
                {!hideClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Bağla"
                    className="-mr-2 -mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-fg/[0.07] hover:text-fg"
                  >
                    <X className="size-[18px]" />
                  </button>
                )}
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-2">{children}</div>
            {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-sunken/40 px-6 py-4 light:bg-bg">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export interface DrawerProps extends Omit<ModalProps, 'size'> {
  side?: 'right' | 'left' | 'bottom';
  size?: 'sm' | 'md' | 'lg';
}

const drawerW = { sm: 'sm:w-[360px]', md: 'sm:w-[460px]', lg: 'sm:w-[640px]' };

/** Side panel / bottom sheet. <Drawer open side="right" title="Filtrlər" onClose={…}>…</Drawer> */
export function Drawer({ open, onClose, title, description, children, footer, side = 'right', size = 'md', className, dismissible = true, hideClose }: DrawerProps) {
  const mounted = useMounted();
  const ref = useRef<HTMLDivElement>(null);
  const tid = useId();
  useDialogBehavior(open, onClose, ref);
  if (!mounted) return null;

  const isBottom = side === 'bottom';
  const from = isBottom ? { y: '100%' } : { x: side === 'right' ? '100%' : '-100%' };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100]" data-lenis-prevent>
          <motion.div
            className="absolute inset-0 bg-[#05050a]/60 backdrop-blur-sm light:bg-[#2a2418]/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismissible ? onClose : undefined}
          />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? tid : undefined}
            tabIndex={-1}
            className={cn(
              'absolute flex flex-col border-line-strong bg-elev shadow-pop outline-none',
              isBottom
                ? 'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-3xl border-t'
                : cn('inset-y-0 w-full max-w-[100vw]', drawerW[size], side === 'right' ? 'right-0 border-l' : 'left-0 border-r'),
              className,
            )}
            initial={from}
            animate={{ x: 0, y: 0 }}
            exit={{ ...from, transition: { duration: 0.25, ease: [0.7, 0, 0.84, 0] } }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          >
            {isBottom && <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-fg/15" />}
            {(title || !hideClose) && (
              <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
                <div className="min-w-0">
                  {title && (
                    <h2 id={tid} className="font-display text-lg font-semibold">
                      {title}
                    </h2>
                  )}
                  {description && <p className="mt-1 text-sm text-muted">{description}</p>}
                </div>
                {!hideClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Bağla"
                    className="-mr-2 inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-fg/[0.07] hover:text-fg"
                  >
                    <X className="size-[18px]" />
                  </button>
                )}
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
            {footer && <div className="flex items-center justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
