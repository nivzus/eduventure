/** Shared small helpers. */

/** Baku (UTC+4, no DST) calendar day key `YYYY-MM-DD`. */
export function dayKey(d: Date = new Date()): string {
  const shifted = new Date(d.getTime() + 4 * 3600 * 1000);
  return shifted.toISOString().slice(0, 10);
}

/** ISO week key `YYYY-Www` in Baku time. */
export function weekKey(d: Date = new Date()): string {
  const shifted = new Date(d.getTime() + 4 * 3600 * 1000);
  const date = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function daysBetweenKeys(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function slugify(input: string): string {
  const map: Record<string, string> = { ə: 'e', ı: 'i', ö: 'o', ü: 'u', ş: 's', ç: 'c', ğ: 'g', İ: 'i', Ə: 'e' };
  return input
    .split('')
    .map((c) => map[c] ?? c)
    .join('')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function round(n: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/** Strip `passwordHash`/`tokenVersion` from a user row. */
export function publicUser<T extends { passwordHash?: string; tokenVersion?: number }>(
  u: T,
): Omit<T, 'passwordHash' | 'tokenVersion'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, tokenVersion, ...rest } = u;
  return rest;
}
