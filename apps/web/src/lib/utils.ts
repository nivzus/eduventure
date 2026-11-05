import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes safely (clsx + tailwind-merge). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ── Easing / motion constants (shared by everyone) ──────────── */
export const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;
export const DUR = { micro: 0.25, enter: 0.5, hero: 0.8 } as const;
export const SPRING_UI = { type: 'spring', stiffness: 380, damping: 30 } as const;
export const SPRING_PLAYFUL = { type: 'spring', stiffness: 120, damping: 20 } as const;

/* ── Formatting (Azerbaijani locale) ─────────────────────────── */
const LOCALE = 'az-Latn-AZ';

const AZ_MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr',
];
const AZ_MONTHS_SHORT = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avq', 'sen', 'okt', 'noy', 'dek'];
const AZ_WEEKDAYS = ['bazar', 'bazar ertəsi', 'çərşənbə axşamı', 'çərşənbə', 'cümə axşamı', 'cümə', 'şənbə'];
const AZ_WEEKDAYS_SHORT = ['B', 'B.e', 'Ç.a', 'Ç', 'C.a', 'C', 'Ş'];

export { AZ_MONTHS, AZ_MONTHS_SHORT, AZ_WEEKDAYS, AZ_WEEKDAYS_SHORT };

function toDate(d: Date | string | number | null | undefined): Date | null {
  if (d === null || d === undefined || d === '') return null;
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? null : date;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "5 noyabr 2026" (omits year when current year unless `withYear`). */
export function formatDate(
  d: Date | string | number | null | undefined,
  opts: { withYear?: boolean; short?: boolean } = {},
): string {
  const date = toDate(d);
  if (!date) return '—';
  const sameYear = date.getFullYear() === new Date().getFullYear();
  const month = (opts.short ? AZ_MONTHS_SHORT : AZ_MONTHS)[date.getMonth()];
  const year = opts.withYear || !sameYear ? ` ${date.getFullYear()}` : '';
  return `${date.getDate()} ${month}${year}`;
}

/** "5 noyabr 2026, 14:30" */
export function formatDateTime(d: Date | string | number | null | undefined): string {
  const date = toDate(d);
  if (!date) return '—';
  return `${formatDate(date)}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** "14:30" */
export function formatTime(d: Date | string | number | null | undefined): string {
  const date = toDate(d);
  if (!date) return '—';
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Relative: "indicə", "5 dəq əvvəl", "3 saat əvvəl", "dünən", "4 gün əvvəl", "2 gün sonra" … */
export function formatRelative(d: Date | string | number | null | undefined): string {
  const date = toDate(d);
  if (!date) return '—';
  const diffSec = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  const future = diffSec > 0;
  const wrap = (s: string) => (future ? `${s} sonra` : `${s} əvvəl`);
  if (abs < 45) return future ? 'bir azdan' : 'indicə';
  if (abs < 3600) return wrap(`${Math.round(abs / 60)} dəq`);
  if (abs < 86400) return wrap(`${Math.round(abs / 3600)} saat`);
  const days = Math.round(abs / 86400);
  if (days === 1) return future ? 'sabah' : 'dünən';
  if (days < 7) return wrap(`${days} gün`);
  if (days < 30) return wrap(`${Math.round(days / 7)} həftə`);
  return formatDate(date);
}

/** Seconds → "12:05" or "1:02:05" (timer style). */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/** Seconds → human "1 saat 5 dəq", "12 dəq", "45 san". */
export function formatDuration(totalSec: number | null | undefined): string {
  if (totalSec === null || totalSec === undefined || Number.isNaN(totalSec)) return '—';
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return m ? `${h} saat ${m} dəq` : `${h} saat`;
  if (m > 0) return sec && m < 10 ? `${m} dəq ${sec} san` : `${m} dəq`;
  return `${sec} san`;
}

/** Percent on a 0–100 scale: 87.3 → "87%". */
export function formatPercent(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `${Number(v).toFixed(digits)}%`;
}

/** Ratio on a 0–1 scale: 0.873 → "87%". */
export function formatRatio(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return formatPercent(v * 100, digits);
}

/** 12500 → "12 500" */
export function formatNumber(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat(LOCALE, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  })
    .format(n)
    .replace(/ /g, ' ');
}

/** 12500 → "12.5K" */
export function formatCompact(n: number): string {
  if (Math.abs(n) < 1000) return String(Math.round(n));
  if (Math.abs(n) < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

/* ── Gamification helpers (mirror backend rules) ─────────────── */
export function levelFromXp(xp: number) {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
}
/** XP needed to *reach* `level` (level 1 → 0, 2 → 100, 3 → 400 …). */
export function xpForLevel(level: number) {
  return 100 * Math.pow(Math.max(0, level - 1), 2);
}
export function levelProgress(xp: number) {
  const lvl = levelFromXp(xp);
  const cur = xpForLevel(lvl);
  const next = xpForLevel(lvl + 1);
  return { level: lvl, progress: (xp - cur) / (next - cur), current: cur, next };
}

/* ── Misc ────────────────────────────────────────────────────── */
export function initials(name?: string | null) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const chars = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0]?.slice(0, 2) ?? '?';
  return chars.toLocaleUpperCase('az');
}

/** Deterministic hash for gradients/colors. */
export function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** "ə" aware slug */
export function slugify(s: string) {
  const map: Record<string, string> = { ə: 'e', ı: 'i', ö: 'o', ü: 'u', ş: 's', ç: 'c', ğ: 'g', İ: 'i' };
  return s
    .toLocaleLowerCase('az')
    .replace(/[əıöüşçğİ]/g, (c) => map[c] ?? c)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Tone → CSS var / tailwind class helpers */
export type Tone = 'neutral' | 'signal' | 'ember' | 'aurora' | 'glacier' | 'moss' | 'danger';
export const toneVar: Record<Tone, string> = {
  neutral: 'var(--fg-muted)',
  signal: 'var(--signal)',
  ember: 'var(--ember)',
  aurora: 'var(--aurora)',
  glacier: 'var(--glacier)',
  moss: 'var(--moss)',
  danger: 'var(--danger)',
};
export const toneText: Record<Tone, string> = {
  neutral: 'text-muted',
  signal: 'text-signal',
  ember: 'text-ember',
  aurora: 'text-aurora',
  glacier: 'text-glacier',
  moss: 'text-moss',
  danger: 'text-danger',
};
export const toneBg: Record<Tone, string> = {
  neutral: 'bg-fg/40',
  signal: 'bg-signal',
  ember: 'bg-ember',
  aurora: 'bg-aurora',
  glacier: 'bg-glacier',
  moss: 'bg-moss',
  danger: 'bg-danger',
};
/** Soft (tinted) surface for chips/badges */
export const toneSoft: Record<Tone, string> = {
  neutral: 'bg-fg/[0.06] text-muted border-line',
  signal: 'bg-signal/12 text-fg border-signal/30 light:bg-signal light:text-signal-fg',
  ember: 'bg-ember/12 text-ember border-ember/25',
  aurora: 'bg-aurora/14 text-aurora border-aurora/25',
  glacier: 'bg-glacier/12 text-glacier border-glacier/25',
  moss: 'bg-moss/12 text-moss border-moss/25',
  danger: 'bg-danger/12 text-danger border-danger/25',
};
