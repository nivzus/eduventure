/* Procedural topographic contours — deterministic (SSR-safe). */

export type Pt = [number, number];

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Catmull-Rom → cubic bezier path. */
export function smoothPath(points: Pt[], closed = false, tension = 1): string {
  if (points.length < 2) return '';
  const p = points;
  const n = p.length;
  const get = (i: number): Pt => (closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${r1(p[0][0])} ${r1(p[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1);
    const p1 = get(i);
    const p2 = get(i + 1);
    const p3 = get(i + 2);
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension;
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension;
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension;
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension;
    d += `C${r1(c1x)} ${r1(c1y)} ${r1(c2x)} ${r1(c2y)} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return closed ? d + 'Z' : d;
}

export interface Peak {
  x: number;
  y: number;
  /** first ring radius */
  r0: number;
  /** number of rings */
  rings: number;
  /** ring spacing */
  gap: number;
  /** horizontal stretch */
  sx?: number;
  seed?: number;
}

export interface Contour {
  d: string;
  /** index contour (every 5th) */
  major: boolean;
  /** ring index from peak (0 = summit) */
  level: number;
  peak: number;
}

export function generateContours(peaks: Peak[], samples = 30): Contour[] {
  const out: Contour[] = [];
  peaks.forEach((pk, pi) => {
    const rnd = mulberry32(pk.seed ?? pi * 97 + 13);
    const ph = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28, rnd() * 6.28];
    const amp = [0.16 + rnd() * 0.08, 0.07 + rnd() * 0.05, 0.035 + rnd() * 0.03, 0.02];
    const sx = pk.sx ?? 1.25;
    for (let k = 0; k < pk.rings; k++) {
      const r = pk.r0 + k * pk.gap;
      const pts: Pt[] = [];
      for (let i = 0; i < samples; i++) {
        const t = (i / samples) * Math.PI * 2;
        const drift = k * 0.06;
        const f =
          1 +
          amp[0] * Math.sin(2 * t + ph[0] + drift) +
          amp[1] * Math.sin(3 * t + ph[1] - drift * 0.7) +
          amp[2] * Math.sin(5 * t + ph[2] + drift * 1.3) +
          amp[3] * Math.sin(7 * t + ph[3]);
        pts.push([pk.x + Math.cos(t) * r * f * sx, pk.y + Math.sin(t) * r * f]);
      }
      out.push({ d: smoothPath(pts, true), major: k % 5 === 4, level: k, peak: pi });
    }
  });
  return out;
}

/** Preset terrains (viewBox 1200×800). */
export const TERRAINS: Record<string, Peak[]> = {
  ridge: [
    { x: 860, y: 300, r0: 18, rings: 24, gap: 24, sx: 1.35, seed: 7 },
    { x: 230, y: 650, r0: 14, rings: 10, gap: 22, sx: 1.2, seed: 21 },
  ],
  summit: [{ x: 600, y: 420, r0: 16, rings: 26, gap: 22, sx: 1.4, seed: 3 }],
  valley: [
    { x: 160, y: 140, r0: 20, rings: 14, gap: 24, sx: 1.3, seed: 11 },
    { x: 1080, y: 700, r0: 20, rings: 16, gap: 24, sx: 1.2, seed: 5 },
  ],
};

const cache = new Map<string, Contour[]>();
export function terrain(name: keyof typeof TERRAINS | string): Contour[] {
  const key = String(name);
  if (!cache.has(key)) cache.set(key, generateContours(TERRAINS[key] ?? TERRAINS.ridge));
  return cache.get(key)!;
}
