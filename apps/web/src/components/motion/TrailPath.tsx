'use client';

import { motion, useInView, useReducedMotion } from 'motion/react';
import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { smoothPath, type Pt } from './topo';

export interface TrailWaypoint {
  x: number;
  y: number;
  done?: boolean;
  current?: boolean;
  label?: string;
}

export interface TrailPathProps {
  /** SVG path; or pass `points` to auto-smooth */
  d?: string;
  points?: Pt[];
  viewBox?: string;
  /** 0–1 how much of the trail is drawn (default 1) */
  progress?: number;
  color?: string;
  strokeWidth?: number;
  /** dashed "unwalked" track under the drawn trail */
  track?: boolean;
  waypoints?: TrailWaypoint[];
  /** draw when scrolled into view (default true) */
  inView?: boolean;
  duration?: number;
  delay?: number;
  className?: string;
  preserveAspectRatio?: string;
}

/**
 * Hiking-trail line drawn with pathLength 0→progress, optional waypoints.
 * <TrailPath points={[[0,80],[40,20],[100,50]]} viewBox="0 0 100 100" progress={0.6} waypoints={[…]} />
 */
export function TrailPath({
  d,
  points,
  viewBox = '0 0 100 100',
  progress = 1,
  color = 'var(--signal)',
  strokeWidth = 2,
  track = true,
  waypoints = [],
  inView = true,
  duration = 1.6,
  delay = 0,
  className,
  preserveAspectRatio = 'none',
}: TrailPathProps) {
  const ref = useRef<SVGSVGElement>(null);
  const seen = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const reduce = useReducedMotion();
  const path = d ?? (points ? smoothPath(points) : '');
  const show = !inView || seen;
  const p = Math.max(0, Math.min(1, progress));

  return (
    <svg ref={ref} viewBox={viewBox} preserveAspectRatio={preserveAspectRatio} className={cn('overflow-visible', className)} fill="none" aria-hidden>
      {track && (
        <path d={path} stroke="var(--border-strong)" strokeWidth={strokeWidth} strokeDasharray="1 6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      )}
      <motion.path
        d={path}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: reduce ? p : 0 }}
        animate={{ pathLength: show ? p : 0 }}
        transition={{ duration: reduce ? 0 : duration, delay, ease: [0.22, 1, 0.36, 1] }}
      />
      {waypoints.map((w, i) => (
        <g key={i}>
          {w.current && (
            <circle cx={w.x} cy={w.y} r={6} fill={color} className="origin-center animate-pulse-ring" style={{ transformBox: 'fill-box' }} />
          )}
          <motion.circle
            cx={w.x}
            cy={w.y}
            r={w.current ? 4.5 : 3.5}
            fill={w.done || w.current ? color : 'var(--bg)'}
            stroke={w.done || w.current ? color : 'var(--border-strong)'}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            initial={{ scale: reduce ? 1 : 0 }}
            animate={{ scale: show ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22, delay: delay + (duration * i) / Math.max(1, waypoints.length) }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          />
        </g>
      ))}
    </svg>
  );
}
