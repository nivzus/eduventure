'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { terrain } from './topo';

export interface TopoBackgroundProps {
  className?: string;
  /** terrain preset: 'ridge' | 'summit' | 'valley' */
  variant?: 'ridge' | 'summit' | 'valley';
  /** slow drift animation */
  animated?: boolean;
  /** draw a few flowing signal-colored dashed contours */
  highlight?: boolean;
  /** radial fade mask at edges */
  fade?: boolean;
  /** 0–1 overall opacity multiplier */
  intensity?: number;
}

/**
 * Animated topographic contour lines. Absolutely positioned — place inside a `relative` parent.
 * <TopoBackground variant="ridge" highlight fade />
 */
export const TopoBackground = memo(function TopoBackground({
  className,
  variant = 'ridge',
  animated = true,
  highlight = false,
  fade = true,
  intensity = 1,
}: TopoBackgroundProps) {
  const lines = terrain(variant);
  const live = animated; // CSS animations are disabled globally under prefers-reduced-motion
  const hl = highlight ? lines.filter((l) => l.major).slice(0, 3) : [];

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      style={{
        opacity: intensity,
        maskImage: fade ? 'radial-gradient(ellipse 85% 75% at 60% 45%, #000 35%, transparent 100%)' : undefined,
        WebkitMaskImage: fade ? 'radial-gradient(ellipse 85% 75% at 60% 45%, #000 35%, transparent 100%)' : undefined,
      }}
    >
      <svg
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        className={cn('absolute -inset-[6%] h-[112%] w-[112%]', live && 'animate-topo-drift')}
        fill="none"
      >
        <g strokeLinejoin="round">
          {lines.map((l, i) => (
            <path
              key={i}
              d={l.d}
              stroke={l.major ? 'var(--topo-strong)' : 'var(--topo)'}
              strokeWidth={l.major ? 1.25 : 0.8}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
        {hl.map((l, i) => (
          <path
            key={`hl-${i}`}
            d={l.d}
            stroke="var(--signal)"
            strokeOpacity={0.55}
            strokeWidth={1.4}
            strokeDasharray="2 14"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            className={live ? 'animate-dash-flow' : undefined}
            style={{ animationDuration: `${8 + i * 3}s` }}
          />
        ))}
      </svg>
    </div>
  );
});
