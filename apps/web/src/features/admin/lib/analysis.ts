import type { AdminAttempt } from '../types';

const isScored = (a: AdminAttempt) => a.status === 'GRADED' || a.status === 'SUBMITTED';

/**
 * Classical item analysis from attempt results.
 *  - p: proportion of students who answered the question correctly (difficulty index)
 *  - d: discrimination index = p(upper 27%) − p(lower 27%) by total percent
 */
export function itemAnalysis(attempts: AdminAttempt[]): Map<string, { p: number; d: number | null; n: number }> {
  const scored = attempts.filter((a) => isScored(a) && a.result && Object.keys(a.result).length);
  const out = new Map<string, { p: number; d: number | null; n: number }>();
  if (!scored.length) return out;
  const sorted = [...scored].sort((a, b) => b.percent - a.percent);
  const k = Math.max(1, Math.round(sorted.length * 0.27));
  const upper = sorted.slice(0, k);
  const lower = sorted.slice(-k);
  const qids = new Set<string>();
  scored.forEach((a) => Object.keys(a.result ?? {}).forEach((q) => qids.add(q)));
  const correctOf = (a: AdminAttempt, q: string) => {
    const r = a.result?.[q];
    if (!r) return null;
    if (r.correct === null || r.correct === undefined) return r.max > 0 ? r.points / r.max >= 0.5 : null;
    return r.correct;
  };
  const rate = (list: AdminAttempt[], q: string) => {
    let n = 0;
    let c = 0;
    list.forEach((a) => {
      const v = correctOf(a, q);
      if (v === null) return;
      n++;
      if (v) c++;
    });
    return n ? c / n : null;
  };
  qids.forEach((q) => {
    const p = rate(scored, q);
    const pu = rate(upper, q);
    const pl = rate(lower, q);
    const n = scored.filter((a) => correctOf(a, q) !== null).length;
    out.set(q, { p: p ?? 0, d: sorted.length >= 4 && pu != null && pl != null ? pu - pl : null, n });
  });
  return out;
}

export function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function timeStats(attempts: AdminAttempt[]) {
  const t = attempts
    .filter(isScored)
    .map((a) => a.timeSpentSec)
    .filter((v) => typeof v === 'number' && v > 0)
    .sort((a, b) => a - b);
  if (!t.length) return null;
  return { min: t[0], p25: quantile(t, 0.25), median: quantile(t, 0.5), p75: quantile(t, 0.75), max: t[t.length - 1], n: t.length };
}

/** 10 buckets of 10 percentage points from attempts (fallback when the API sends no distribution). */
export function distributionFrom(attempts: AdminAttempt[]): { bucket: string; count: number }[] {
  const b = new Array(10).fill(0);
  attempts.filter(isScored).forEach((a) => b[Math.min(9, Math.floor((a.percent ?? 0) / 10))]++);
  return b.map((count, i) => ({ bucket: `${i * 10}-${i * 10 + 10}`, count }));
}

export function difficultyLabel(p: number): { label: string; tone: 'moss' | 'signal' | 'ember' | 'danger' } {
  if (p >= 0.85) return { label: 'Çox asan', tone: 'moss' };
  if (p >= 0.6) return { label: 'Asan', tone: 'moss' };
  if (p >= 0.35) return { label: 'Orta', tone: 'signal' };
  if (p >= 0.15) return { label: 'Çətin', tone: 'ember' };
  return { label: 'Çox çətin', tone: 'danger' };
}

export function discriminationLabel(d: number | null): string {
  if (d == null) return 'Az məlumat';
  if (d >= 0.4) return 'Əla ayırd edir';
  if (d >= 0.3) return 'Yaxşı';
  if (d >= 0.2) return 'Qənaətbəxş';
  if (d >= 0) return 'Zəif';
  return 'Problemli';
}
