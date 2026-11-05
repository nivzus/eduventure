import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { grouped } from '../../lib/format';
import { altitudeOf, coordsOf, summitOf, terrain, toneOf, toneVar, type Tone } from '../../lib/topo';

interface CoverArtProps {
  /** Stable seed — usually the content id. */
  seed: string;
  /** Explicit tone; defaults to a hash of `toneKey` (category) or the seed. */
  tone?: Tone;
  toneKey?: string | null;
  coverUrl?: string | null;
  alt?: string;
  className?: string;
  /** Show coordinates + summit altitude meta labels. */
  meta?: boolean;
  /** Line density multiplier. */
  density?: number;
  /** Optional overlay content (badges etc). */
  children?: React.ReactNode;
}

const W = 400;
const H = 300;

/**
 * Generative "map tile" cover. Every piece of content gets its own deterministic landform
 * (index contours every 4th line, a summit marker and fake coordinates) when no image is uploaded.
 */
export function CoverArt({ seed, tone, toneKey, coverUrl, alt = '', className, meta = true, density = 1, children }: CoverArtProps) {
  const t = tone ?? toneOf(toneKey ?? seed);
  const lines = useMemo(() => terrain(seed, W, H, density), [seed, density]);
  const [sx, sy] = useMemo(() => summitOf(seed, W, H), [seed]);
  const color = toneVar(t);

  return (
    <div className={cn('relative isolate overflow-hidden bg-sunken', className)}>
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt={alt} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      ) : (
        <>
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: `radial-gradient(120% 90% at ${(sx / W) * 100}% ${(sy / H) * 100}%, color-mix(in oklab, ${color} 16%, transparent), transparent 60%)`,
            }}
          />
          <svg
            aria-hidden
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid slice"
            className="absolute inset-0 h-full w-full"
            fill="none"
          >
            {lines.map((l, i) => {
              const index = l.level % 4 === 3;
              return (
                <path
                  key={i}
                  d={l.d}
                  stroke={l.level < 3 ? color : 'var(--fg)'}
                  strokeOpacity={l.level < 3 ? 0.75 - l.level * 0.15 : index ? 0.22 : 0.09}
                  strokeWidth={index ? 1.3 : 0.8}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
            <g transform={`translate(${sx} ${sy})`}>
              <path d="M0,-7 L6,4 L-6,4 Z" fill={color} />
              <circle r="14" stroke={color} strokeOpacity="0.4" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
            </g>
          </svg>
          {meta && (
            <>
              <span className="mono-label absolute bottom-3 left-3 !text-[15px] opacity-80">{coordsOf(seed)}</span>
              <span className="mono-label absolute top-3 right-3 !text-[15px]" style={{ color }}>
                ▲ {grouped(altitudeOf(seed))} m
              </span>
            </>
          )}
        </>
      )}
      {children}
    </div>
  );
}
