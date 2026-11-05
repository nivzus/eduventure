'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';
import { seededRandom } from '../../lib/utils';

type Pt = [number, number];

/** Catmull-Rom → cubic Bézier for a closed smooth ring. */
function closedPath(points: Pt[]): string {
  const n = points.length;
  let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + 'Z';
}

export function buildContours(seed: string, width: number, height: number, rings = 9) {
  const rand = seededRandom(seed);
  const peaks = rand() > 0.55 ? 2 : 1;
  const out: { d: string; ring: number; peak: number }[] = [];
  const summits: Pt[] = [];
  for (let p = 0; p < peaks; p++) {
    const cx = width * (peaks === 1 ? 0.55 + rand() * 0.3 : p === 0 ? 0.25 + rand() * 0.2 : 0.7 + rand() * 0.2);
    const cy = height * (0.35 + rand() * 0.4);
    summits.push([cx, cy]);
    const ph = [rand() * 6.28, rand() * 6.28, rand() * 6.28, rand() * 6.28];
    const amp = [0.08 + rand() * 0.1, 0.05 + rand() * 0.08, 0.03 + rand() * 0.05, 0.02 + rand() * 0.03];
    const stretch = 0.65 + rand() * 0.35;
    const base = Math.min(width, height) * 0.06;
    const step = Math.max(width, height) * (peaks === 1 ? 0.075 : 0.06);
    const count = peaks === 1 ? rings : Math.ceil(rings * 0.75);
    for (let r = 0; r < count; r++) {
      const R = base + r * step;
      const pts: Pt[] = [];
      const N = 28;
      for (let i = 0; i < N; i++) {
        const t = (i / N) * Math.PI * 2;
        const wobble =
          1 +
          amp[0] * Math.sin(2 * t + ph[0] + r * 0.12) +
          amp[1] * Math.sin(3 * t + ph[1] - r * 0.08) +
          amp[2] * Math.sin(5 * t + ph[2]) +
          amp[3] * Math.sin(7 * t + ph[3] + r * 0.2);
        const rr = R * wobble;
        pts.push([cx + Math.cos(t) * rr, cy + Math.sin(t) * rr * stretch]);
      }
      out.push({ d: closedPath(pts), ring: r, peak: p });
    }
  }
  return { paths: out, summits };
}

interface ContourArtProps {
  seed: string;
  className?: string;
  /** Number of rings per peak. */
  rings?: number;
  width?: number;
  height?: number;
  /** Slow drift + draw-in. */
  animated?: boolean;
  /** Draw a summit marker on the highest peak. */
  summit?: boolean;
  strokeWidth?: number;
  color?: string;
}

/**
 * Seeded topographic contour map — every quiz gets its own "terrain".
 * Uses currentColor so the parent decides tint/opacity.
 */
export function ContourArt({
  seed,
  className,
  rings = 9,
  width = 400,
  height = 240,
  animated = false,
  summit = false,
  strokeWidth = 1,
  color,
}: ContourArtProps) {
  const reduce = useReducedMotion();
  const { paths, summits } = useMemo(() => buildContours(seed, width, height, rings), [seed, width, height, rings]);
  const move = animated && !reduce;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      className={cn('pointer-events-none', className)}
      fill="none"
      aria-hidden
      style={color ? { color } : undefined}
    >
      <motion.g
        animate={move ? { x: [0, -6, 4, 0], y: [0, 4, -3, 0], rotate: [0, 0.8, -0.6, 0] } : undefined}
        transition={move ? { duration: 40, repeat: Infinity, ease: 'easeInOut' } : undefined}
        style={{ transformOrigin: '50% 50%' }}
      >
        {paths.map((p, i) => {
          const isIndex = p.ring % 4 === 3;
          return (
            <motion.path
              key={i}
              d={p.d}
              stroke="currentColor"
              strokeWidth={isIndex ? strokeWidth * 1.6 : strokeWidth}
              strokeOpacity={Math.max(0.18, 0.9 - p.ring * 0.07)}
              initial={move ? { pathLength: 0, opacity: 0 } : false}
              animate={move ? { pathLength: 1, opacity: 1 } : undefined}
              transition={move ? { duration: 1.6, delay: 0.1 + p.ring * 0.06, ease: [0.22, 1, 0.36, 1] } : undefined}
            />
          );
        })}
      </motion.g>
      {summit && summits[0] && (
        <g transform={`translate(${summits[0][0]} ${summits[0][1]})`}>
          <circle r={3} fill="currentColor" />
          <path d="M0 0 V-22" stroke="currentColor" strokeWidth={1.4} />
          <path d="M0 -22 L14 -17 L0 -12 Z" fill="currentColor" />
        </g>
      )}
    </svg>
  );
}
