'use client';

import { useCallback, type CSSProperties, type HTMLAttributes, type PointerEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** pointermove handler that writes --mx/--my (px) on the element */
export function useSpotlight() {
  return useCallback((e: PointerEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, []);
}

/** The glow layer (paints under content). Parent needs `group/spot relative isolate` + useSpotlight() as onPointerMove. */
export function SpotlightLayer({ size = 380, color = 'var(--signal)', strength = 0.09, className }: { size?: number; color?: string; strength?: number; className?: string }) {
  return (
    <>
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 -z-[1] rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover/spot:opacity-100',
          className,
        )}
        style={{
          background: `radial-gradient(${size}px circle at var(--mx, 50%) var(--my, 50%), color-mix(in oklab, ${color} ${Math.round(strength * 100)}%, transparent), transparent 70%)`,
        }}
      />
      {/* border glow */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-[1] rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover/spot:opacity-100"
        style={{
          padding: 1,
          background: `radial-gradient(${size * 0.6}px circle at var(--mx, 50%) var(--my, 50%), color-mix(in oklab, ${color} 55%, transparent), transparent 70%)`,
          WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        } as CSSProperties}
      />
    </>
  );
}

export interface SpotlightProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  size?: number;
  color?: string;
  strength?: number;
}

/** Cursor-following glow container. <Spotlight className="rounded-3xl border …">…</Spotlight> */
export function Spotlight({ children, className, size, color, strength, onPointerMove, ...rest }: SpotlightProps) {
  const handler = useSpotlight();
  return (
    <div
      className={cn('group/spot relative isolate', className)}
      onPointerMove={(e) => {
        handler(e);
        onPointerMove?.(e);
      }}
      {...rest}
    >
      <SpotlightLayer size={size} color={color} strength={strength} />
      {children}
    </div>
  );
}
