import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface MarqueeProps {
  children: ReactNode;
  /** seconds per loop (default 40) */
  speed?: number;
  reverse?: boolean;
  pauseOnHover?: boolean;
  /** gap between items, CSS length (default 2.5rem) */
  gap?: string;
  /** fade edges */
  fade?: boolean;
  className?: string;
}

/** Infinite horizontal ticker (CSS-driven, pauses under reduced motion). */
export function Marquee({ children, speed = 40, reverse, pauseOnHover = true, gap = '2.5rem', fade = true, className }: MarqueeProps) {
  const style = { '--marquee-duration': `${speed}s`, '--gap': gap } as CSSProperties;
  return (
    <div
      className={cn('group/marquee relative flex overflow-hidden', className)}
      style={{
        ...style,
        maskImage: fade ? 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)' : undefined,
        WebkitMaskImage: fade ? 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)' : undefined,
      }}
    >
      <div
        className={cn(
          'flex w-max shrink-0',
          reverse ? 'animate-marquee-reverse' : 'animate-marquee',
          pauseOnHover && 'group-hover/marquee:[animation-play-state:paused]',
        )}
      >
        <div className="flex shrink-0 items-center" style={{ gap, paddingRight: gap }}>
          {children}
        </div>
        <div className="flex shrink-0 items-center" style={{ gap, paddingRight: gap }} aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
