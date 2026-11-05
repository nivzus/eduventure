'use client';

import Link from 'next/link';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SpotlightLayer, useSpotlight } from '@/components/motion/Spotlight';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** cursor spotlight + 2px hover lift + stronger border */
  interactive?: boolean;
  /** inner padding (default true → p-6) */
  padded?: boolean;
  /** render as a Next <Link> (implies interactive) */
  href?: string;
  as?: 'div' | 'section' | 'article' | 'li' | 'aside';
  /** spotlight color (CSS color/var), default signal */
  glow?: string;
  children?: ReactNode;
}

export const cardBase = 'relative isolate rounded-3xl border border-line bg-elev shadow-paper';

/**
 * <Card>…</Card> · <Card interactive>…</Card> · <Card href="/quizzes/1" padded={false}>…</Card>
 */
export function Card({ interactive, padded = true, href, as = 'div', glow, className, children, onPointerMove, ...rest }: CardProps) {
  const spot = useSpotlight();
  const isInteractive = interactive || !!href;
  const cls = cn(
    cardBase,
    padded && 'p-5 sm:p-6',
    isInteractive &&
      'group/spot transition-[transform,border-color,background-color,box-shadow] duration-300 ease-out-expo hover:-translate-y-1 hover:rotate-[-0.35deg] hover:border-ink/60 hover:shadow-[4px_5px_0_0_var(--ink)]',
    href && 'block focus-visible:outline-offset-4',
    className,
  );
  const inner = (
    <>
      {isInteractive && <SpotlightLayer color={glow} />}
      {children}
    </>
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const move: any = isInteractive
    ? (e: React.PointerEvent<HTMLElement>) => {
        spot(e);
        onPointerMove?.(e as unknown as React.PointerEvent<HTMLDivElement>);
      }
    : onPointerMove;

  if (href) {
    return (
      <Link href={href} className={cls} onPointerMove={move} {...(rest as HTMLAttributes<HTMLAnchorElement>)}>
        {inner}
      </Link>
    );
  }
  const Comp = as as 'div';
  return (
    <Comp className={cls} onPointerMove={move} {...rest}>
      {inner}
    </Comp>
  );
}
