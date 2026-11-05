'use client';

import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { coverBackground, resolveCoverColor } from '../../lib/utils';
import { ContourArt } from './ContourArt';

interface CoverArtProps {
  seed: string;
  color?: string | null;
  className?: string;
  children?: ReactNode;
  animated?: boolean;
  summit?: boolean;
  rings?: number;
}

/** Quiz "terrain" cover: colour wash + seeded contour map + grain-friendly vignette. */
export function CoverArt({ seed, color, className, children, animated, summit, rings = 9 }: CoverArtProps) {
  const c = resolveCoverColor(color, seed);
  return (
    <div
      className={cn('relative isolate overflow-hidden bg-sunken', className)}
      style={{ '--cover': c, backgroundImage: coverBackground(c, seed) } as CSSProperties}
    >
      <ContourArt
        seed={seed}
        rings={rings}
        animated={animated}
        summit={summit}
        className="absolute inset-0 h-full w-full text-[var(--cover)] opacity-60 light:text-fg light:opacity-25"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-elev via-transparent to-transparent opacity-80" aria-hidden />
      {children && <div className="relative z-[1] h-full">{children}</div>}
    </div>
  );
}

export function useCoverColor(seed: string, color?: string | null) {
  return resolveCoverColor(color, seed);
}
