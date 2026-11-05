const AZ_MONTHS = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avq', 'sen', 'okt', 'noy', 'dek'];
const AZ_MONTHS_LONG = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avqust',
  'sentyabr',
  'oktyabr',
  'noyabr',
  'dekabr',
];

function toDate(v: string | Date | null | undefined): Date | null {
  if (!v) return null;
  const d = typeof v === 'string' ? new Date(v) : v;
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "5 noy 2026" */
export function shortDate(v: string | Date | null | undefined): string {
  const d = toDate(v);
  if (!d) return '—';
  return `${d.getDate()} ${AZ_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "5 noyabr 2026" */
export function longDate(v: string | Date | null | undefined): string {
  const d = toDate(v);
  if (!d) return '—';
  return `${d.getDate()} ${AZ_MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

/** "3 dəq əvvəl", "dünən", "5 gün əvvəl" … */
export function relativeTime(v: string | Date | null | undefined): string {
  const d = toDate(v);
  if (!d) return '';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 45) return 'indicə';
  if (diff < 3600) return `${Math.round(diff / 60)} dəq əvvəl`;
  if (diff < 86400) return `${Math.round(diff / 3600)} saat əvvəl`;
  if (diff < 172800) return 'dünən';
  if (diff < 86400 * 30) return `${Math.round(diff / 86400)} gün əvvəl`;
  return shortDate(d);
}

/** Relative future: "10 dəq sonra", "sabah", "3 gün sonra". */
export function untilTime(v: string | Date | null | undefined): string {
  const d = toDate(v);
  if (!d) return '';
  const diff = (d.getTime() - Date.now()) / 1000;
  if (diff <= 60) return 'indi';
  if (diff < 3600) return `${Math.round(diff / 60)} dəq sonra`;
  if (diff < 86400) return `${Math.round(diff / 3600)} saat sonra`;
  if (diff < 172800) return 'sabah';
  return `${Math.round(diff / 86400)} gün sonra`;
}

export const pad2 = (n: number) => String(n).padStart(2, '0');

/** mm:ss */
export function clock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
}

/** 1 240 (thin-space thousands like a topo map) */
export function grouped(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function pct(v: number, digits = 0): string {
  return `${v.toFixed(digits)}%`;
}

/** Azerbaijani nouns don't pluralise after numerals: "3 məqalə". Kept as a helper for clarity. */
export function count(n: number, noun: string): string {
  return `${n} ${noun}`;
}

/** Strip markdown to plain text (for previews and excerpts). */
export function plainText(md: string | null | undefined, max = 220): string {
  if (!md) return '';
  const t = md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`>~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > max ? t.slice(0, max).replace(/\s+\S*$/, '') + '…' : t;
}

/** Words → minutes (matches API readingMinutes: 200 wpm, min 1). */
export function readingMinutes(md: string): number {
  const words = plainText(md, 1e9).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function wordCount(md: string): number {
  return plainText(md, 1e9).split(/\s+/).filter(Boolean).length;
}

const AZ_MAP: Record<string, string> = {
  ə: 'e', Ə: 'e', ğ: 'g', Ğ: 'g', ı: 'i', I: 'i', İ: 'i', ö: 'o', Ö: 'o', ü: 'u', Ü: 'u', ş: 's', Ş: 's', ç: 'c', Ç: 'c',
};

/** Same transliteration rule as the API's slugify. */
export function slugify(input: string): string {
  return (
    (input ?? '')
      .split('')
      .map((ch) => AZ_MAP[ch] ?? ch)
      .join('')
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'bolme'
  );
}

/** Case/diacritic-insensitive fold used for client-side filtering & match highlighting. */
export function fold(s: string): string {
  return s.toLocaleLowerCase('az').normalize('NFKD').replace(/[̀-ͯ]/g, '');
}
