'use client';

import { createElement, isValidElement, useEffect, useLayoutEffect, useState, type ComponentType, type ReactNode, type RefObject } from 'react';

export type IconLike = ComponentType<{ className?: string; size?: number | string; strokeWidth?: number }> | ReactNode;

/** Accepts a lucide component (`Trophy`) or an element (`<Trophy />`). */
export function renderIcon(icon: IconLike | undefined, className?: string, size?: number) {
  if (!icon) return null;
  if (isValidElement(icon)) return icon;
  if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && '$$typeof' in (icon as object))) {
    return createElement(icon as ComponentType<{ className?: string; size?: number }>, { className, size, 'aria-hidden': true } as never);
  }
  return icon as ReactNode;
}

export const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

export type Side = 'top' | 'bottom' | 'left' | 'right';
export type Align = 'start' | 'center' | 'end';

/** Fixed-position coordinates for a floating element anchored to `anchorRef`. */
export function useAnchoredPosition(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  floatingRef: RefObject<HTMLElement | null>,
  { side = 'bottom', align = 'start', offset = 8 }: { side?: Side; align?: Align; offset?: number } = {},
) {
  const [pos, setPos] = useState<{ top: number; left: number; origin: string } | null>(null);

  useIsoLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const compute = () => {
      const a = anchorRef.current?.getBoundingClientRect();
      const f = floatingRef.current;
      if (!a) return;
      const fw = f?.offsetWidth ?? 0;
      const fh = f?.offsetHeight ?? 0;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let s = side;
      if (s === 'bottom' && a.bottom + offset + fh > vh - 8 && a.top - offset - fh > 8) s = 'top';
      if (s === 'top' && a.top - offset - fh < 8) s = 'bottom';
      if (s === 'right' && a.right + offset + fw > vw - 8) s = 'left';
      if (s === 'left' && a.left - offset - fw < 8) s = 'right';
      let top = 0;
      let left = 0;
      if (s === 'bottom' || s === 'top') {
        top = s === 'bottom' ? a.bottom + offset : a.top - offset - fh;
        left = align === 'start' ? a.left : align === 'end' ? a.right - fw : a.left + a.width / 2 - fw / 2;
      } else {
        left = s === 'right' ? a.right + offset : a.left - offset - fw;
        top = align === 'start' ? a.top : align === 'end' ? a.bottom - fh : a.top + a.height / 2 - fh / 2;
      }
      left = Math.max(8, Math.min(left, vw - fw - 8));
      top = Math.max(8, Math.min(top, vh - fh - 8));
      const originY = s === 'bottom' ? 'top' : s === 'top' ? 'bottom' : 'center';
      const originX = s === 'right' ? 'left' : s === 'left' ? 'right' : align === 'end' ? 'right' : align === 'start' ? 'left' : 'center';
      setPos({ top, left, origin: `${originX} ${originY}` });
    };
    compute();
    const raf = requestAnimationFrame(compute);
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [open, side, align, offset]);

  return pos;
}

/** Close on outside pointerdown + Escape. */
export function useDismiss(open: boolean, onClose: () => void, refs: RefObject<HTMLElement | null>[]) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (refs.some((r) => r.current?.contains(t))) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose]);
}

const FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

let lockCount = 0;
/** Escape to close, focus trap, scroll lock, focus restore — for dialogs. */
export function useDialogBehavior(open: boolean, onClose: () => void, ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    lockCount++;
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = 'hidden';

    const t = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const auto = el.querySelector<HTMLElement>('[autofocus],[data-autofocus]');
      (auto ?? el.querySelector<HTMLElement>(FOCUSABLE) ?? el).focus({ preventScroll: true });
    }, 30);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const el = ref.current;
      if (!el) return;
      const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      lockCount--;
      if (lockCount <= 0) html.style.overflow = prevOverflow;
      prev?.focus?.({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
