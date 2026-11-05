'use client';

import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

/** Reads h2/h3 ids from the rendered article body. */
export function useToc(bodyRef: React.RefObject<HTMLElement | null>, contentKey: string): TocItem[] {
  const [items, setItems] = useState<TocItem[]>([]);
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const hs = Array.from(body.querySelectorAll<HTMLHeadingElement>('h2[id], h3[id]'));
    setItems(hs.map((h) => ({ id: h.id, text: h.textContent ?? '', level: h.tagName === 'H2' ? 2 : 3 })));
  }, [bodyRef, contentKey]);
  return items;
}

/** Id of the heading the reader is currently inside. */
export function useActiveHeading(items: TocItem[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (!items.length) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      let current: string | null = null;
      for (const it of items) {
        const el = document.getElementById(it.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top < 160) current = it.id;
        else break;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [items]);
  return active;
}

export function scrollToHeading(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - 104, behavior: 'smooth' });
  history.replaceState(null, '', `#${id}`);
}

export function TableOfContents({
  items,
  active,
  onNavigate,
  layoutId = 'toc-active',
}: {
  items: TocItem[];
  active: string | null;
  onNavigate?: () => void;
  layoutId?: string;
}) {
  if (!items.length) return <p className="text-sm text-subtle">Bu məqalədə bölmə başlıqları yoxdur.</p>;
  let section = 0;
  return (
    <nav aria-label="Mündəricat">
      <ol className="relative space-y-0.5 border-l border-line">
        {items.map((it) => {
          const isActive = it.id === active;
          if (it.level === 2) section += 1;
          return (
            <li key={it.id} className="relative">
              {isActive && (
                <motion.span
                  layoutId={layoutId}
                  className="absolute top-1 bottom-1 -left-px w-0.5 rounded-full bg-signal"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <a
                href={`#${it.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToHeading(it.id);
                  onNavigate?.();
                }}
                className={cn(
                  'flex gap-2.5 rounded-r-lg py-1.5 pr-2 text-[13px] leading-snug transition-colors',
                  it.level === 2 ? 'pl-4' : 'pl-8 text-[12.5px]',
                  isActive ? 'text-fg' : 'text-subtle hover:text-muted',
                )}
              >
                {it.level === 2 && <span className="font-mono text-[10px] leading-[1.9] text-subtle tabular">{String(section).padStart(2, '0')}</span>}
                <span className="line-clamp-2">{it.text}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
