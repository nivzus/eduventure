'use client';

import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Info, X, XCircle, Sparkles } from 'lucide-react';
import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ToastKind = 'success' | 'error' | 'info' | 'xp';
export interface ToastItem {
  id: number;
  kind: ToastKind;
  title: ReactNode;
  description?: ReactNode;
  duration: number;
  action?: { label: string; onClick: () => void };
}
export interface ToastOptions {
  description?: ReactNode;
  /** ms (default 4000; errors 6000) */
  duration?: number;
  action?: { label: string; onClick: () => void };
}

let items: ToastItem[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const EMPTY: ToastItem[] = [];

function push(kind: ToastKind, title: ReactNode, opts: ToastOptions = {}) {
  const id = ++seq;
  items = [...items, { id, kind, title, description: opts.description, action: opts.action, duration: opts.duration ?? (kind === 'error' ? 6000 : 4000) }].slice(-5);
  emit();
  return id;
}

function dismiss(id?: number) {
  items = id === undefined ? [] : items.filter((t) => t.id !== id);
  emit();
}

/**
 * toast.success('Yadda saxlanıldı') · toast.error(errorMessage(e)) · toast.info('…', { description })
 * toast.xp('+25 XP', { description: 'Test tamamlandı' })
 */
export const toast = Object.assign((title: ReactNode, opts?: ToastOptions) => push('info', title, opts), {
  success: (title: ReactNode, opts?: ToastOptions) => push('success', title, opts),
  error: (title: ReactNode, opts?: ToastOptions) => push('error', title, opts),
  info: (title: ReactNode, opts?: ToastOptions) => push('info', title, opts),
  xp: (title: ReactNode, opts?: ToastOptions) => push('xp', title, opts),
  dismiss,
});

const ICON = {
  success: <CheckCircle2 className="size-[18px] text-moss" />,
  error: <XCircle className="size-[18px] text-danger" />,
  info: <Info className="size-[18px] text-glacier" />,
  xp: <Sparkles className="size-[18px] text-aurora" />,
};
const BAR = { success: 'bg-moss', error: 'bg-danger', info: 'bg-glacier', xp: 'bg-aurora' };

function ToastCard({ t }: { t: ToastItem }) {
  useEffect(() => {
    const timer = setTimeout(() => dismiss(t.id), t.duration);
    return () => clearTimeout(timer);
  }, [t.id, t.duration]);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 24, scale: 0.94, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, x: 40, scale: 0.96, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      role={t.kind === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border border-line-strong bg-elev/95 p-4 pr-10 shadow-pop backdrop-blur-xl"
    >
      <span className="mt-0.5 shrink-0">{ICON[t.kind]}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold leading-snug text-fg">{t.title}</div>
        {t.description && <div className="mt-1 text-[13px] leading-snug text-muted">{t.description}</div>}
        {t.action && (
          <button
            type="button"
            className="mt-2 text-[13px] font-semibold text-fg underline decoration-signal decoration-2 underline-offset-4"
            onClick={() => {
              t.action?.onClick();
              dismiss(t.id);
            }}
          >
            {t.action.label}
          </button>
        )}
      </div>
      <button type="button" aria-label="Bağla" onClick={() => dismiss(t.id)} className="absolute right-2.5 top-2.5 rounded-lg p-1 text-subtle transition hover:bg-fg/[0.07] hover:text-fg">
        <X className="size-4" />
      </button>
      <motion.span
        className={cn('absolute bottom-0 left-0 h-[2px] origin-left', BAR[t.kind])}
        style={{ width: '100%' }}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: t.duration / 1000, ease: 'linear' }}
      />
    </motion.li>
  );
}

/** Mounted once in the root layout (via Providers). */
export function Toaster() {
  const list = useSyncExternalStore(subscribe, () => items, () => EMPTY);
  return (
    <ol
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-3 z-[300] mx-auto flex w-[min(420px,calc(100vw-24px))] flex-col gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto sm:mx-0"
    >
      <AnimatePresence initial={false}>
        {list.map((t) => (
          <ToastCard key={t.id} t={t} />
        ))}
      </AnimatePresence>
    </ol>
  );
}
