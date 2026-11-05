'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Award, Lock, icons, type LucideIcon } from 'lucide-react';
import { C, TONE, type Tone } from './tokens';
import { contourRings, roundedPolygon, sparkle } from './topo';

export type BadgeTone = Exclude<Tone, 'danger'>;
export type BadgeSize = 'sm' | 'md' | 'lg' | number;

export interface AchievementBadgeProps {
  /** lucide icon name ("trophy", "book-open", "BookOpen") or a lucide component */
  icon?: string | LucideIcon;
  tone?: BadgeTone;
  locked?: boolean;
  /** sm 56px · md 88px · lg 128px (width) – or any pixel width */
  size?: BadgeSize;
  className?: string;
  /** Accessible label, e.g. the achievement title. Omit when a visible title sits next to it. */
  title?: string;
  /** Disable the idle shimmer (e.g. inside long lists). */
  shimmer?: boolean;
}

const SIZES = { sm: 56, md: 88, lg: 128 } as const;

const iconMap = icons as unknown as Record<string, LucideIcon>;

/** "book-open" | "book_open" | "BookOpen" → lucide component (falls back to Award). */
export function resolveLucideIcon(icon: string | LucideIcon | undefined): LucideIcon {
  if (!icon) return Award;
  if (typeof icon !== 'string') return icon;
  const pascal = icon.trim().replace(/(^|[-_\s]+)([a-z0-9])/gi, (_m, _s, c: string) => c.toUpperCase());
  return iconMap[pascal] ?? iconMap[icon] ?? Award;
}

/* Geometry (viewBox 0 0 100 112) — pointy-top hex medal on two ribbon tails */
const HEX = roundedPolygon(50, 50, 44, 6, 7);
const HEX_INNER = roundedPolygon(50, 50, 36.5, 6, 5.5);
const RIBBON_L = 'M31 74L45 80L39.5 109L32.6 102.2L24.6 106.4Z';
const RIBBON_R = 'M69 74L55 80L60.5 109L67.4 102.2L75.4 106.4Z';

const SEEDS = [3, 11, 19, 29, 41, 53];

export function AchievementBadge({
  icon,
  tone = 'aurora',
  locked = false,
  size = 'md',
  className,
  title,
  shimmer = true,
}: AchievementBadgeProps) {
  const reduce = useReducedMotion();
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const Icon = resolveLucideIcon(icon);
  const width = typeof size === 'number' ? size : SIZES[size];

  // Deterministic per-icon terrain so every badge has its own "summit".
  const seed = React.useMemo(() => {
    const key = typeof icon === 'string' ? icon : (icon?.displayName ?? 'award');
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    return SEEDS[h % SEEDS.length] + (h % 7);
  }, [icon]);
  const rings = React.useMemo(
    () =>
      contourRings({ cx: 56, cy: 42, rx: 46, ry: 42, count: 7, seed, wobble: 0.16, inner: 0.12, dx: -4, dy: 6 }),
    [seed],
  );

  const c = locked ? C.subtle : TONE[tone];
  const iconFg = locked ? C.subtle : tone === 'signal' ? C.signalFg : C.bg;
  const live = !locked && shimmer && !reduce;

  return (
    <svg
      viewBox="0 0 100 112"
      width={width}
      height={(width * 112) / 100}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title ? `${title}${locked ? ' (kilidli)' : ''}` : undefined}
      aria-hidden={title ? undefined : true}
      style={{
        overflow: 'visible',
        filter: locked
          ? undefined
          : `drop-shadow(0 6px 18px color-mix(in srgb, ${c} 28%, transparent))`,
      }}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <clipPath id={`${uid}-hex`}>
          <path d={HEX} />
        </clipPath>
        <linearGradient id={`${uid}-face`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor={c} stopOpacity={locked ? 0.08 : 0.34} />
          <stop offset="0.6" stopColor={c} stopOpacity={locked ? 0.03 : 0.1} />
          <stop offset="1" stopColor={c} stopOpacity={locked ? 0.02 : 0.04} />
        </linearGradient>
        <linearGradient id={`${uid}-shine`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* ribbon tails */}
      <g opacity={locked ? 0.35 : 1}>
        <path d={RIBBON_L} fill={c} />
        <path d={RIBBON_R} fill={c} />
        <path d={RIBBON_L} fill="#000" fillOpacity={0.28} />
        <path d={RIBBON_R} fill="#000" fillOpacity={0.12} />
        <path d="M38 77.5L35 103M62 77.5L65 103" stroke={C.bg} strokeOpacity={0.35} strokeWidth={1.2} />
      </g>

      {/* medal face */}
      <path d={HEX} fill={locked ? C.elev : C.surface} />
      <path d={HEX} fill={`url(#${uid}-face)`} />
      <g clipPath={`url(#${uid}-hex)`} fill="none" stroke={c} strokeWidth={0.8}>
        {rings.map((d, i) => (
          <path key={i} d={d} strokeOpacity={(locked ? 0.18 : 0.3) + i * 0.035} />
        ))}
      </g>
      <path
        d={HEX_INNER}
        fill="none"
        stroke={c}
        strokeOpacity={locked ? 0.35 : 0.55}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeDasharray="0.1 3.4"
      />
      <path
        d={HEX}
        fill="none"
        stroke={c}
        strokeWidth={2.4}
        strokeDasharray={locked ? '4 3.2' : undefined}
        strokeOpacity={locked ? 0.7 : 1}
      />

      {/* medallion */}
      {locked ? (
        <circle cx={50} cy={50} r={18.5} fill={C.bg} fillOpacity={0.5} stroke={c} strokeWidth={1.4} strokeDasharray="2.5 2.5" />
      ) : (
        <>
          <circle cx={50} cy={50} r={20.5} fill="none" stroke={c} strokeOpacity={0.35} strokeWidth={1} />
          <circle cx={50} cy={50} r={18} fill={c} />
          <path d="M36.2 44.4A15 15 0 0 1 44.6 36.1" fill="none" stroke="#fff" strokeOpacity={0.45} strokeWidth={1.6} strokeLinecap="round" />
        </>
      )}
      <Icon x={39} y={39} size={22} width={22} height={22} color={iconFg} strokeWidth={2.2} absoluteStrokeWidth={false} opacity={locked ? 0.7 : 1} />

      {!locked && <path d={sparkle(80, 20, 5)} fill={c} />}

      {/* idle shimmer sweep (wide soft band + thin bright band) */}
      {live && (
        <g clipPath={`url(#${uid}-hex)`} pointerEvents="none">
          <g transform="rotate(22 50 50)">
            <motion.rect
              y={-20}
              width={34}
              height={150}
              fill={`url(#${uid}-shine)`}
              opacity={0.55}
              initial={{ x: -70 }}
              animate={{ x: 140 }}
              transition={{ duration: 1.5, ease: [0.45, 0, 0.25, 1], repeat: Infinity, repeatDelay: 2.8, delay: 0.4 }}
            />
            <motion.rect
              y={-20}
              width={10}
              height={150}
              fill={`url(#${uid}-shine)`}
              initial={{ x: -60 }}
              animate={{ x: 150 }}
              transition={{ duration: 1.5, ease: [0.45, 0, 0.25, 1], repeat: Infinity, repeatDelay: 2.8, delay: 0.48 }}
            />
          </g>
        </g>
      )}

      {/* lock pip */}
      {locked && (
        <g>
          <circle cx={50} cy={92} r={9.5} fill={C.surface} stroke={C.lineStrong} strokeWidth={1.2} />
          <Lock x={44.5} y={86.5} size={11} width={11} height={11} color={C.muted} strokeWidth={2.4} />
        </g>
      )}
    </svg>
  );
}

export default AchievementBadge;
