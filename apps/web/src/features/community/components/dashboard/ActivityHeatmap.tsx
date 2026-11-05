'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useMemo, useState } from 'react';
import { AZ_MONTHS_SHORT, AZ_WEEKDAYS, formatNumber } from '@/lib/utils';
import type { ActivityDay } from '../../types';
import { dayKey, fmtDate } from '../../lib/format';

const DAYS = 120;
const STEP = 16;
const PAD_L = 30;
const PAD_T = 20;
const EASE = [0.22, 1, 0.36, 1] as const;

interface Cell {
  key: string;
  date: Date;
  col: number;
  row: number;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
}

/* ─────────── marching squares over a smoothed, upsampled field ─────────── */

function smooth(f: number[][]): number[][] {
  const W = f.length;
  const H = f[0].length;
  const k = [
    [1, 2, 1],
    [2, 4, 2],
    [1, 2, 1],
  ];
  const out = f.map((c) => c.slice());
  for (let x = 0; x < W; x++)
    for (let y = 0; y < H; y++) {
      let s = 0;
      let w = 0;
      for (let i = -1; i <= 1; i++)
        for (let j = -1; j <= 1; j++) {
          const xx = x + i;
          const yy = y + j;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          s += f[xx][yy] * k[i + 1][j + 1];
          w += k[i + 1][j + 1];
        }
      out[x][y] = s / w;
    }
  return out;
}

function upsample(f: number[][], k: number): number[][] {
  const W = f.length;
  const H = f[0].length;
  const UW = (W - 1) * k + 1;
  const UH = (H - 1) * k + 1;
  const out: number[][] = Array.from({ length: UW }, () => new Array(UH).fill(0));
  for (let x = 0; x < UW; x++)
    for (let y = 0; y < UH; y++) {
      const gx = x / k;
      const gy = y / k;
      const x0 = Math.min(Math.floor(gx), W - 2);
      const y0 = Math.min(Math.floor(gy), H - 2);
      const tx = gx - x0;
      const ty = gy - y0;
      const a = f[x0][y0] * (1 - tx) + f[x0 + 1][y0] * tx;
      const b = f[x0][y0 + 1] * (1 - tx) + f[x0 + 1][y0 + 1] * tx;
      out[x][y] = a * (1 - ty) + b * ty;
    }
  return out;
}

function isoPath(f: number[][], t: number, toX: (x: number) => number, toY: (y: number) => number): string {
  const W = f.length;
  const H = f[0].length;
  let d = '';
  const lerp = (a: number, b: number) => (t - a) / (b - a || 1e-6);
  for (let x = 0; x < W - 1; x++)
    for (let y = 0; y < H - 1; y++) {
      const tl = f[x][y];
      const tr = f[x + 1][y];
      const br = f[x + 1][y + 1];
      const bl = f[x][y + 1];
      const c = (tl >= t ? 8 : 0) | (tr >= t ? 4 : 0) | (br >= t ? 2 : 0) | (bl >= t ? 1 : 0);
      if (c === 0 || c === 15) continue;
      const T: [number, number] = [x + lerp(tl, tr), y];
      const R: [number, number] = [x + 1, y + lerp(tr, br)];
      const B: [number, number] = [x + lerp(bl, br), y + 1];
      const L: [number, number] = [x, y + lerp(tl, bl)];
      const segs: [number, number][][] = (
        {
          1: [[L, B]],
          2: [[B, R]],
          3: [[L, R]],
          4: [[T, R]],
          5: [[L, T], [B, R]],
          6: [[T, B]],
          7: [[L, T]],
          8: [[L, T]],
          9: [[T, B]],
          10: [[T, R], [L, B]],
          11: [[T, R]],
          12: [[L, R]],
          13: [[B, R]],
          14: [[L, B]],
        } as Record<number, [number, number][][]>
      )[c];
      for (const [p, q] of segs) d += `M${toX(p[0]).toFixed(1)} ${toY(p[1]).toFixed(1)}L${toX(q[0]).toFixed(1)} ${toY(q[1]).toFixed(1)}`;
    }
  return d;
}

/* ─────────── component ─────────── */

export function ActivityHeatmap({ activity }: { activity: ActivityDay[] }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<Cell | null>(null);

  const model = useMemo(() => {
    const map = new Map<string, number>();
    activity.forEach((d) => map.set(d.date.slice(0, 10), (map.get(d.date.slice(0, 10)) ?? 0) + d.count));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const first = new Date(today);
    first.setDate(today.getDate() - (DAYS - 1));
    // align to Monday
    const mondayOffset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - mondayOffset);
    const totalDays = Math.round((today.getTime() - start.getTime()) / 86400000) + 1;
    const cols = Math.ceil(totalDays / 7);
    const max = Math.max(1, ...Array.from(map.values()));
    const cells: Cell[] = [];
    for (let i = 0; i < cols * 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const key = dayKey(date);
      const count = map.get(key) ?? 0;
      const future = date.getTime() > today.getTime();
      const inWindow = date.getTime() >= first.getTime();
      const ratio = count / max;
      const level = (count === 0 ? 0 : ratio > 0.75 ? 4 : ratio > 0.5 ? 3 : ratio > 0.25 ? 2 : 1) as Cell['level'];
      if (inWindow || future) cells.push({ key, date, col: Math.floor(i / 7), row: i % 7, count: inWindow ? count : 0, level: inWindow ? level : 0, future });
    }
    // field padded with a zero border so contours close
    const field: number[][] = Array.from({ length: cols + 2 }, () => new Array(9).fill(0));
    cells.forEach((c) => (field[c.col + 1][c.row + 1] = c.future ? 0 : c.count / max));
    const K = 3;
    const up = upsample(smooth(smooth(field)), K);
    const toX = (x: number) => PAD_L + (x / K - 1) * STEP + STEP / 2;
    const toY = (y: number) => PAD_T + (y / K - 1) * STEP + STEP / 2;
    const contours = [0.08, 0.2, 0.38, 0.6].map((t) => isoPath(up, t, toX, toY)).filter(Boolean);

    // months
    const months: { col: number; label: string }[] = [];
    let lastMonth = -1;
    for (let c = 0; c < cols; c++) {
      const d = new Date(start);
      d.setDate(start.getDate() + c * 7);
      const firstOfCol = cells.find((x) => x.col === c && !x.future);
      if (!firstOfCol) continue;
      if (d.getMonth() !== lastMonth) {
        if (c < cols - 1 || months.length === 0) months.push({ col: c, label: AZ_MONTHS_SHORT[d.getMonth()] });
        lastMonth = d.getMonth();
      }
    }

    // stats
    const inWin = cells.filter((c) => !c.future);
    const total = inWin.reduce((s, c) => s + c.count, 0);
    const activeDays = inWin.filter((c) => c.count > 0).length;
    let best = 0;
    let run = 0;
    inWin
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .forEach((c) => {
        run = c.count > 0 ? run + 1 : 0;
        best = Math.max(best, run);
      });

    return { cells, cols, contours, months, total, activeDays, best, width: PAD_L + cols * STEP + 4, height: PAD_T + 7 * STEP + 2 };
  }, [activity]);

  const R = [1.5, 3, 4, 5, 6.2];
  const O = [0.45, 0.42, 0.62, 0.82, 1];

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <span className="mono-label">Topoqrafik xəritə · son 120 gün</span>
          <h3 className="mt-1.5 text-lg font-semibold sm:text-xl">
            Fəaliyyət <span className="accent text-2xl text-muted">relyefi</span>
          </h3>
        </div>
        <dl className="flex gap-5 text-right">
          {[
            ['Cəmi', formatNumber(model.total)],
            ['Aktiv gün', formatNumber(model.activeDays)],
            ['Ən uzun seriya', `${model.best} gün`],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="mono-label">{k}</dt>
              <dd className="mt-0.5 font-display text-lg font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${model.width} ${model.height}`}
          className="h-auto w-full overflow-visible"
          role="img"
          aria-label={`Son 120 gündə ${model.total} fəaliyyət, ${model.activeDays} aktiv gün`}
          onPointerLeave={() => setHover(null)}
        >
          {/* month labels */}
          {model.months.map((m) => (
            <text key={`${m.col}-${m.label}`} x={PAD_L + m.col * STEP + 1} y={11} className="fill-[var(--fg-subtle)] font-mono text-[9px] uppercase">
              {m.label}
            </text>
          ))}
          {/* weekday labels (Mon, Wed, Fri) */}
          {[0, 2, 4].map((r) => (
            <text key={r} x={0} y={PAD_T + r * STEP + STEP / 2 + 3} className="fill-[var(--fg-subtle)] font-mono text-[9px]">
              {['B.e', '', 'Ç', '', 'C'][r]}
            </text>
          ))}

          {/* contour isolines */}
          <g fill="none" stroke="var(--signal)" strokeLinecap="round">
            {model.contours.map((d, i) => (
              <motion.path
                key={i}
                d={d}
                strokeWidth={0.8}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 0.16 + i * 0.1 }}
                transition={{ duration: 1.2, delay: 0.6 + i * 0.15, ease: EASE }}
              />
            ))}
          </g>

          {/* survey dots */}
          {model.cells.map((c) => {
            const cx = PAD_L + c.col * STEP + STEP / 2;
            const cy = PAD_T + c.row * STEP + STEP / 2;
            if (c.future) return null;
            const isToday = c.key === dayKey(new Date());
            return (
              <g key={c.key}>
                <motion.circle
                  cx={cx}
                  cy={cy}
                  r={R[c.level]}
                  fill={c.level === 0 ? 'var(--fg-subtle)' : 'var(--signal)'}
                  initial={reduce ? false : { scale: 0, opacity: 0 }}
                  animate={{ scale: hover?.key === c.key ? 1.25 : 1, opacity: c.level === 0 ? O[0] * 0.6 : O[c.level] }}
                  transition={{ duration: 0.5, delay: reduce ? 0 : c.col * 0.025 + c.row * 0.01, ease: EASE }}
                  style={{ transformOrigin: `${cx}px ${cy}px` }}
                />
                {isToday && <circle cx={cx} cy={cy} r={7.2} fill="none" stroke="var(--fg)" strokeOpacity={0.5} strokeWidth={1} />}
                <rect
                  x={cx - STEP / 2}
                  y={cy - STEP / 2}
                  width={STEP}
                  height={STEP}
                  fill="transparent"
                  onPointerEnter={() => setHover(c)}
                  aria-hidden
                />
              </g>
            );
          })}
        </svg>

        <AnimatePresence>
          {hover && (
            <motion.div
              key={hover.key}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl border border-line bg-surface px-3 py-2 shadow-pop"
              style={{
                left: `${((PAD_L + hover.col * STEP + STEP / 2) / model.width) * 100}%`,
                top: `${((PAD_T + hover.row * STEP) / model.height) * 100}%`,
              }}
            >
              <p className="font-display text-sm font-semibold">
                {hover.count} <span className="font-sans text-xs font-normal text-muted">fəaliyyət</span>
              </p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-subtle">
                {fmtDate(hover.date, 'd MMMM')}, {AZ_WEEKDAYS[hover.date.getDay()]}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-end gap-2 text-subtle" aria-hidden>
        <span className="font-mono text-[10px] uppercase tracking-wider">Az</span>
        <svg width={88} height={14} viewBox="0 0 88 14">
          {[0, 1, 2, 3, 4].map((l) => (
            <circle key={l} cx={8 + l * 18} cy={7} r={R[l]} fill={l === 0 ? 'var(--fg-subtle)' : 'var(--signal)'} opacity={l === 0 ? O[0] * 0.6 : O[l]} />
          ))}
        </svg>
        <span className="font-mono text-[10px] uppercase tracking-wider">Çox</span>
      </div>
    </div>
  );
}
