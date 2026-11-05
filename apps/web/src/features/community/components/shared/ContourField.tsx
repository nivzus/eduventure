'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useMemo } from 'react';
import { cn, hashString } from '@/lib/utils';

/** Seeded PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Closed Catmull-Rom spline through points → SVG path. */
export function closedSpline(pts: [number, number][]): string {
  const n = pts.length;
  if (n < 3) return '';
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + 'Z';
}

export function contourRings(seed: string | number, opts: { cx: number; cy: number; rings: number; gap: number; base: number; wobble?: number; points?: number }) {
  const r = rng(typeof seed === 'number' ? seed : hashString(seed));
  const { cx, cy, rings, gap, base, wobble = 0.18, points = 14 } = opts;
  const phases = [r() * Math.PI * 2, r() * Math.PI * 2, r() * Math.PI * 2];
  const amps = [wobble, wobble * 0.6, wobble * 0.35];
  const out: string[] = [];
  for (let k = 0; k < rings; k++) {
    const R = base + k * gap;
    const pts: [number, number][] = [];
    for (let i = 0; i < points; i++) {
      const t = (i / points) * Math.PI * 2;
      const n =
        1 +
        amps[0] * Math.sin(2 * t + phases[0] + k * 0.25) +
        amps[1] * Math.sin(3 * t + phases[1] - k * 0.18) +
        amps[2] * Math.sin(5 * t + phases[2] + k * 0.1);
      pts.push([cx + Math.cos(t) * R * n, cy + Math.sin(t) * R * n * 0.82]);
    }
    out.push(closedSpline(pts));
  }
  return out;
}

interface ContourFieldProps {
  seed?: string;
  className?: string;
  rings?: number;
  /** 0-1 position of the "summit" within the box */
  x?: number;
  y?: number;
  tone?: string;
  draw?: boolean;
  strokeWidth?: number;
}

/** Decorative topographic rings — absolutely positioned, pointer-transparent. */
export function ContourField({ seed = 'eduventure', className, rings = 9, x = 0.8, y = 0.2, tone = 'var(--topo-strong)', draw = true, strokeWidth = 1 }: ContourFieldProps) {
  const reduce = useReducedMotion();
  const paths = useMemo(() => contourRings(seed, { cx: x * 400, cy: y * 300, rings, gap: 26, base: 14 }), [seed, rings, x, y]);
  return (
    <svg aria-hidden viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}>
      <g fill="none" stroke={tone} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke">
        {paths.map((d, i) => (
          <motion.path
            key={i}
            d={d}
            vectorEffect="non-scaling-stroke"
            initial={draw && !reduce ? { pathLength: 0, opacity: 0 } : false}
            animate={{ pathLength: 1, opacity: 1 - i / (rings + 3) }}
            transition={{ duration: 1.6, delay: 0.15 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </g>
    </svg>
  );
}
