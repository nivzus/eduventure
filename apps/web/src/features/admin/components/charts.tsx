'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn, formatNumber } from '@/lib/utils';

const EASE = [0.22, 1, 0.36, 1] as const;

/* ─────────── helpers ─────────── */

export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    setWidth(Math.round(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export function niceTicks(max: number, count = 4, integer = true): number[] {
  if (!(max > 0)) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  let step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  if (integer) step = Math.max(1, Math.round(step));
  const top = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) out.push(Number(v.toFixed(6)));
  return out;
}

/** Bar path: 4px rounded data-end, square at baseline. */
function columnPath(x: number, y: number, w: number, h: number, r = 4) {
  if (h <= 0) return '';
  const rr = Math.min(r, h, w / 2);
  const base = y + h;
  return `M${x},${base}L${x},${y + rr}Q${x},${y} ${x + rr},${y}L${x + w - rr},${y}Q${x + w},${y} ${x + w},${y + rr}L${x + w},${base}Z`;
}

/* ─────────── ColumnChart ─────────── */

export interface ColumnDatum {
  key: string;
  label: string;
  value: number;
  /** long label for the tooltip */
  title?: string;
  color?: string;
}

interface ColumnChartProps {
  data: ColumnDatum[];
  height?: number;
  /** touching columns (histogram) separated by a 2px surface gap */
  touching?: boolean;
  color?: string;
  valueLabel?: (v: number) => string;
  /** vertical marker at a fractional x (0-1 of the plot) */
  marker?: { at: number; label: string };
  ariaLabel: string;
  className?: string;
  /** dim while refetching (keeps the frame) */
  stale?: boolean;
  /** print the value above each column */
  showValues?: boolean;
  /** ink outline on columns (notebook "sticker" look) */
  inked?: boolean;
}

export function ColumnChart({ data, height = 240, touching, color = 'var(--signal)', valueLabel, marker, ariaLabel, className, stale, showValues, inked = true }: ColumnChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const fmt = valueLabel ?? ((v: number) => formatNumber(v));

  const PAD_L = 34;
  const PAD_R = 6;
  const PAD_T = showValues ? 20 : 10;
  const AXIS = 26;
  const plotW = Math.max(0, width - PAD_L - PAD_R);
  const plotH = height - PAD_T - AXIS;
  const n = data.length || 1;
  const band = plotW / n;
  const gap = touching ? 2 : Math.max(2, band * 0.35);
  const barW = Math.max(1, Math.min(touching ? 64 : 28, band - gap));
  const max = Math.max(0, ...data.map((d) => d.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;
  const y = (v: number) => PAD_T + plotH - (v / top) * plotH;
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(1, plotW / 46)));

  return (
    <div ref={ref} className={cn('relative w-full transition-opacity duration-300', stale && 'opacity-50', className)} style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel} onPointerLeave={() => setHover(null)}>
          {/* grid + y ticks */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD_L} x2={width - PAD_R} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
              <text x={PAD_L - 8} y={y(t) + 3.5} textAnchor="end" className="fill-[var(--fg-subtle)] font-mono text-[10px] tabular">
                {t >= 10000 ? `${Math.round(t / 1000)}K` : formatNumber(t)}
              </text>
            </g>
          ))}
          {/* columns */}
          {data.map((d, i) => {
            const cx = PAD_L + band * i + band / 2;
            const h = plotH * (d.value / top);
            const fill = d.color ?? color;
            return (
              <g key={d.key}>
                <motion.path
                  d={columnPath(cx - barW / 2, y(d.value), barW, h)}
                  fill={fill}
                  stroke={inked ? 'var(--ink)' : undefined}
                  strokeWidth={inked ? 1.5 : undefined}
                  strokeLinejoin="round"
                  initial={reduce ? false : { scaleY: 0 }}
                  animate={{ scaleY: 1, opacity: hover == null || hover === i ? 1 : 0.55 }}
                  transition={{ scaleY: { duration: 0.7, delay: 0.1 + i * Math.min(0.03, 0.6 / n), ease: EASE }, opacity: { duration: 0.15 } }}
                  style={{ originY: 1, transformBox: 'fill-box' }}
                />
                {/* hit target: full band */}
                <rect
                  x={PAD_L + band * i}
                  y={PAD_T}
                  width={band}
                  height={plotH}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${d.title ?? d.label}: ${fmt(d.value)}`}
                  onPointerEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  className="outline-none"
                />
                {showValues && d.value > 0 && (
                  <text x={cx} y={y(d.value) - 6} textAnchor="middle" className="fill-[var(--fg)] font-mono text-[11px] font-semibold tabular">
                    {fmt(d.value)}
                  </text>
                )}
                {i % labelEvery === 0 && (
                  <text x={cx} y={height - 8} textAnchor="middle" className="fill-[var(--fg-subtle)] font-mono text-[10px]">
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}
          {/* baseline */}
          <line x1={PAD_L} x2={width - PAD_R} y1={PAD_T + plotH} y2={PAD_T + plotH} stroke="var(--border-strong)" strokeWidth={1} />
          {marker && (
            <g>
              <line
                x1={PAD_L + plotW * marker.at}
                x2={PAD_L + plotW * marker.at}
                y1={PAD_T - 4}
                y2={PAD_T + plotH}
                stroke="var(--fg)"
                strokeOpacity={0.6}
                strokeWidth={1}
              />
              <text x={PAD_L + plotW * marker.at + 6} y={PAD_T + 6} className="fill-[var(--fg-muted)] font-mono text-[10px] uppercase">
                {marker.label}
              </text>
            </g>
          )}
        </svg>
      )}
      <AnimatePresence>
        {hover != null && data[hover] && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl border border-line bg-surface px-3 py-2 shadow-pop"
            style={{
              left: Math.min(Math.max(PAD_L + band * hover + band / 2, 60), width - 60),
              top: Math.max(y(data[hover].value) - 8, 30),
            }}
          >
            <p className="font-display text-sm font-semibold">{fmt(data[hover].value)}</p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-subtle">{data[hover].title ?? data[hover].label}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────── Ranked horizontal bars ─────────── */

export interface HBarDatum {
  key: string;
  label: ReactNode;
  value: number;
  /** text value shown at the tip */
  display?: string;
  sub?: ReactNode;
  color?: string;
  href?: string;
}

export function HBarList({ data, max, color = 'var(--signal)', className, emptyLabel = 'Məlumat yoxdur', inked }: { data: HBarDatum[]; max?: number; color?: string; className?: string; emptyLabel?: string; inked?: boolean }) {
  const reduce = useReducedMotion();
  const m = max ?? Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <p className="py-6 text-center text-sm text-subtle">{emptyLabel}</p>;
  return (
    <ol className={cn('space-y-3.5', className)}>
      {data.map((d, i) => (
        <li key={d.key} className="group">
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-fg">{d.label}</span>
            <span className="shrink-0 font-mono text-xs tabular text-muted">{d.display ?? formatNumber(d.value)}</span>
          </div>
          <div className={cn('relative w-full overflow-hidden rounded-full bg-sunken', inked ? 'h-3.5 border-2 border-ink' : 'h-2')}>
            <motion.div
              className="absolute inset-y-0 left-0 rounded-r-[4px]"
              style={{ background: d.color ?? color }}
              initial={reduce ? false : { width: 0 }}
              whileInView={{ width: `${Math.max(0, Math.min(1, d.value / m)) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.05 * i, ease: EASE }}
            />
          </div>
          {d.sub && <div className="mt-1 text-xs text-subtle">{d.sub}</div>}
        </li>
      ))}
    </ol>
  );
}

/* ─────────── Diverging bar (−1…1) ─────────── */

export function DivergingBar({ value, className, label }: { value: number; className?: string; label?: string }) {
  const reduce = useReducedMotion();
  const v = Math.max(-1, Math.min(1, value));
  const w = Math.abs(v) * 50;
  return (
    <div className={cn('relative h-2 w-full rounded-full bg-sunken', className)} role="img" aria-label={label ?? `${v.toFixed(2)}`}>
      <span className="absolute inset-y-[-3px] left-1/2 w-px bg-[var(--border-strong)]" />
      <motion.span
        className={cn('absolute inset-y-0', v >= 0 ? 'left-1/2 rounded-r-[4px]' : 'right-1/2 rounded-l-[4px]')}
        style={{ background: v >= 0 ? 'var(--aurora)' : 'var(--ember)' }}
        initial={reduce ? false : { width: 0 }}
        whileInView={{ width: `${w}%` }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: EASE }}
      />
    </div>
  );
}

/* ─────────── legend swatch ─────────── */

export function LegendItem({ color, label, shape = 'rect' }: { color: string; label: string; shape?: 'rect' | 'line' | 'dot' }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span
        aria-hidden
        className={cn(shape === 'rect' && 'size-2.5 rounded-[3px]', shape === 'line' && 'h-0.5 w-3 rounded-full', shape === 'dot' && 'size-2 rounded-full')}
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

export function useStableData<T>(data: T | undefined): T | undefined {
  const last = useRef(data);
  if (data !== undefined) last.current = data;
  return useMemo(() => last.current, [data]); // eslint-disable-line react-hooks/exhaustive-deps
}

/* ─────────── TrailLine: hand-drawn line on ruled paper ─────────── */

export interface LineDatum {
  key: string;
  label: string;
  value: number;
  title?: string;
}

function smoothPath(pts: [number, number][]) {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const t = 0.18;
    const c1x = p1[0] + (p2[0] - p0[0]) * t;
    const c2x = p2[0] - (p3[0] - p1[0]) * t;
    // clamp control y between neighbours → no overshoot below 0
    const lo = Math.min(p1[1], p2[1]);
    const hi = Math.max(p1[1], p2[1]);
    const c1y = Math.min(hi, Math.max(lo, p1[1] + (p2[1] - p0[1]) * t));
    const c2y = Math.min(hi, Math.max(lo, p2[1] - (p3[1] - p1[1]) * t));
    d += `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

export function TrailLine({
  data,
  height = 240,
  color = 'var(--signal)',
  valueLabel,
  ariaLabel,
  className,
}: {
  data: LineDatum[];
  height?: number;
  color?: string;
  valueLabel?: (v: number) => string;
  ariaLabel: string;
  className?: string;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const fmt = valueLabel ?? ((v: number) => formatNumber(v));
  const PAD_L = 34;
  const PAD_R = 14;
  const PAD_T = 22;
  const AXIS = 26;
  const plotW = Math.max(0, width - PAD_L - PAD_R);
  const plotH = height - PAD_T - AXIS;
  const n = data.length;
  const max = Math.max(0, ...data.map((d) => d.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;
  const x = (i: number) => PAD_L + (n <= 1 ? plotW / 2 : (plotW * i) / (n - 1));
  const y = (v: number) => PAD_T + plotH - (v / top) * plotH;
  const pts = data.map((d, i) => [x(i), y(d.value)] as [number, number]);
  const line = smoothPath(pts);
  const area = pts.length > 1 ? `${line}L${pts[pts.length - 1][0]},${PAD_T + plotH}L${pts[0][0]},${PAD_T + plotH}Z` : '';
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(1, plotW / 52)));
  const peak = data.reduce((b, d, i) => (d.value > (data[b]?.value ?? -1) ? i : b), 0);

  return (
    <div ref={ref} className={cn('relative w-full', className)} style={{ height }}>
      {width > 0 && n > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel} onPointerLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD_L} x2={width - PAD_R} y1={y(t)} y2={y(t)} stroke="var(--border-strong)" strokeWidth={1} strokeDasharray={t === 0 ? undefined : '3 5'} />
              <text x={PAD_L - 8} y={y(t) + 3.5} textAnchor="end" className="fill-[var(--fg-subtle)] font-mono text-[10px] tabular">
                {formatNumber(t)}
              </text>
            </g>
          ))}
          <motion.path d={area} fill={color} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 0.14 }} transition={{ duration: 0.8, delay: 0.5 }} />
          {/* faint double stroke = marker pen */}
          <motion.path
            d={line}
            fill="none"
            stroke={color}
            strokeOpacity={0.35}
            strokeWidth={2}
            strokeLinecap="round"
            transform="translate(1.5 1.5)"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, ease: EASE, delay: 0.1 }}
          />
          <motion.path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, ease: EASE }}
          />
          {pts.map(([px, py], i) => (
            <g key={data[i].key}>
              <motion.circle
                cx={px}
                cy={py}
                r={hover === i ? 5.5 : data[i].value > 0 ? 3.5 : 2.5}
                fill={hover === i ? color : 'var(--bg-elev)'}
                stroke="var(--ink)"
                strokeWidth={1.5}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + (i / Math.max(1, n)) * 0.8 }}
              />
              <rect
                x={px - plotW / Math.max(1, n - 1) / 2}
                y={PAD_T}
                width={plotW / Math.max(1, n - 1)}
                height={plotH}
                fill="transparent"
                tabIndex={0}
                aria-label={`${data[i].title ?? data[i].label}: ${fmt(data[i].value)}`}
                onPointerEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className="outline-none"
              />
              {i % labelEvery === 0 && (
                <text x={px} y={height - 8} textAnchor="middle" className="fill-[var(--fg-subtle)] font-mono text-[10px]">
                  {data[i].label}
                </text>
              )}
            </g>
          ))}
          {max > 0 && hover == null && (
            <text x={pts[peak][0]} y={pts[peak][1] - 10} textAnchor="middle" className="fill-[var(--fg)] font-mono text-[11px] font-semibold tabular">
              {fmt(data[peak].value)}
            </text>
          )}
        </svg>
      )}
      <AnimatePresence>
        {hover != null && data[hover] && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl border-2 border-ink bg-elev px-3 py-1.5 shadow-stamp-sm"
            style={{ left: Math.min(Math.max(pts[hover][0], 60), width - 60), top: Math.max(pts[hover][1] - 10, 30) }}
          >
            <p className="font-display text-sm font-bold">{fmt(data[hover].value)}</p>
            <p className="hand text-base leading-none text-muted">{data[hover].title ?? data[hover].label}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
