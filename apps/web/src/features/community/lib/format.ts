import { formatCompact, formatNumber } from '@/lib/utils';
import { differenceInCalendarDays, format, isValid } from 'date-fns';
import { az } from 'date-fns/locale';

/* ─────────── numbers ─────────── */

export function fmtNumber(n: number | null | undefined, digits: 0 | 1 = 0): string {
  return formatNumber(n, digits);
}

/** Accepts 0-1 or 0-100 and always returns 0-100. */
export function pct(n: number | null | undefined): number {
  if (n == null || Number.isNaN(n)) return 0;
  return n <= 1 ? n * 100 : n;
}

export function fmtPercent(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return `${Math.round(n)}%`;
}

export function compact(n: number): string {
  return Math.abs(n) < 10_000 ? fmtNumber(n) : formatCompact(n);
}

/* ─────────── dates ─────────── */

export function toDate(d: string | Date | null | undefined): Date | null {
  if (!d) return null;
  const v = d instanceof Date ? d : new Date(d);
  return isValid(v) ? v : null;
}

export function fmtDate(d: string | Date | null | undefined, pattern = 'd MMMM'): string {
  const v = toDate(d);
  return v ? format(v, pattern, { locale: az }) : '—';
}

export function fmtDateTime(d: string | Date | null | undefined): string {
  return fmtDate(d, 'd MMM yyyy, HH:mm');
}

/** Local YYYY-MM-DD key. */
export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.slice(0, 10).split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function relativeTime(d: string | Date | null | undefined, now = new Date()): string {
  const v = toDate(d);
  if (!v) return '—';
  const diffSec = Math.round((now.getTime() - v.getTime()) / 1000);
  if (diffSec < 45) return 'indicə';
  const min = Math.round(diffSec / 60);
  if (min < 60) return `${min} dəq əvvəl`;
  const h = Math.round(min / 60);
  if (h < 24 && differenceInCalendarDays(now, v) === 0) return `${h} saat əvvəl`;
  const days = differenceInCalendarDays(now, v);
  if (days === 1) return `dünən, ${format(v, 'HH:mm')}`;
  if (days < 7) return `${days} gün əvvəl`;
  return fmtDate(v, now.getFullYear() === v.getFullYear() ? 'd MMMM' : 'd MMM yyyy');
}

export type DueTone = 'overdue' | 'today' | 'soon' | 'later' | 'none' | 'done';

export function dueInfo(dueAt: string | null | undefined, done = false, now = new Date()): { label: string; tone: DueTone; days: number | null } {
  const v = toDate(dueAt);
  if (done) return { label: 'Tamamlandı', tone: 'done', days: null };
  if (!v) return { label: 'Müddətsiz', tone: 'none', days: null };
  const days = differenceInCalendarDays(v, now);
  const time = format(v, 'HH:mm');
  if (v.getTime() < now.getTime()) {
    const late = Math.max(differenceInCalendarDays(now, v), 0);
    return { label: late === 0 ? `Bu gün ${time}-da bitdi` : `${late} gün gecikib`, tone: 'overdue', days };
  }
  if (days === 0) return { label: `Bu gün, ${time}`, tone: 'today', days };
  if (days === 1) return { label: `Sabah, ${time}`, tone: 'soon', days };
  if (days < 7) return { label: `${days} gün qalıb`, tone: 'soon', days };
  return { label: fmtDate(v, 'd MMMM, HH:mm'), tone: 'later', days };
}

export function fmtDuration(sec: number | null | undefined): string {
  if (sec == null || Number.isNaN(sec)) return '—';
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h} saat ${m} dəq`;
  if (m > 0) return r ? `${m} dəq ${r} san` : `${m} dəq`;
  return `${r} san`;
}

/* ─────────── greeting ─────────── */

export interface Greeting {
  hello: string;
  camp: string;
  line: string;
}

export function greetingFor(hour: number): Greeting {
  if (hour >= 5 && hour < 12)
    return { hello: 'Sabahınız xeyir', camp: 'Səhər yürüşü', line: 'Təzə hava, təzə sözlər — günə yüngül addımla başlayaq.' };
  if (hour >= 12 && hour < 18)
    return { hello: 'Günortanız xeyir', camp: 'Gündüz keçidi', line: 'Yolun yarısındasan. Bir test, bir neçə kart — və zirvə yaxınlaşır.' };
  if (hour >= 18 && hour < 23)
    return { hello: 'Axşamınız xeyir', camp: 'Axşam düşərgəsi', line: 'Alov yanır. Günü bir kiçik qələbə ilə bağlayaq.' };
  return { hello: 'Gecəniz xeyrə qalsın', camp: 'Gecə ekspedisiyası', line: 'Fənəri yandır — gecə marşrutu sakit və diqqətlidir.' };
}

export function firstName(name?: string | null): string {
  return (name ?? '').trim().split(/\s+/)[0] || 'Səyyah';
}

export function pluralGun(n: number): string {
  return `${n} gün`;
}
