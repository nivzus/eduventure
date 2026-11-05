'use client';

import { useId, useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn, EASE_OUT_EXPO } from '@/lib/utils';

interface AltitudeChartProps {
  /** chronological percents (0–100) */
  points: { percent: number; passed: boolean; label?: string }[];
  passPercent: number;
  className?: string;
}

const W = 600;
const H = 160;
const PAD_T = 14;
const PAD_B = 10;

/** Score history drawn as an elevation profile, pass mark as the snow line. */
export function AltitudeChart({ points, passPercent, className }: AltitudeChartProps) {
  const reduce = useReducedMotion();
  const gid = useId().replace(/:/g, '');
  const n = points.length;
  const xy = useMemo(
    () =>
      points.map((p, i) => {
        const x = n === 1 ? W / 2 : (i / (n - 1)) * W;
        const y = PAD_T + (1 - Math.max(0, Math.min(100, p.percent)) / 100) * (H - PAD_T - PAD_B);
        return [x, y] as const;
      }),
    [points, n],
  );
  if (n === 0) return null;

  const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;
  const passY = PAD_T + (1 - passPercent / 100) * (H - PAD_T - PAD_B);

  return (
    <div className={cn('relative', className)}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-40 w-full overflow-visible" aria-hidden>
        <defs>
          <linearGradient id={`alt-${gid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--signal)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--signal)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[25, 50, 75].map((p) => {
          const y = PAD_T + (1 - p / 100) * (H - PAD_T - PAD_B);
          return <line key={p} x1={0} x2={W} y1={y} y2={y} stroke="var(--border)" vectorEffect="non-scaling-stroke" />;
        })}
        <line
          x1={0}
          x2={W}
          y1={passY}
          y2={passY}
          stroke="var(--moss)"
          strokeDasharray="4 6"
          strokeOpacity={0.7}
          vectorEffect="non-scaling-stroke"
        />
        <motion.path
          d={area}
          fill={`url(#alt-${gid})`}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        />
        <motion.path
          d={line}
          fill="none"
          stroke="var(--signal)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: EASE_OUT_EXPO }}
        />
      </svg>
      {xy.map(([x, y], i) => (
        <motion.span
          key={i}
          initial={reduce ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3 + (i / Math.max(1, n)) * 0.9, type: 'spring', stiffness: 400, damping: 20 }}
          title={points[i].label ? `${points[i].label}: ${Math.round(points[i].percent)}%` : `${Math.round(points[i].percent)}%`}
          className={cn(
            'absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-elev',
            points[i].passed ? 'bg-moss' : 'bg-ember',
          )}
          style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 160}px` }}
        />
      ))}
      <span
        className="absolute right-0 -translate-y-full pb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-moss"
        style={{ top: `${(passY / H) * 160}px` }}
      >
        Keçid {passPercent}%
      </span>
    </div>
  );
}
