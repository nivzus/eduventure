/**
 * Procedural topography — seeded contour rings and smooth trail curves.
 * Everything here is pure and deterministic so covers/maps look identical on server and client.
 */

export type Pt = [number, number];

/** FNV-1a 32-bit hash of a string. */
export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 PRNG — returns a function producing floats in [0, 1). */
export function seeded(seed: number | string): () => number {
  let s = typeof seed === 'string' ? hashString(seed) : seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Closed Catmull-Rom spline through points → SVG path. */
export function closedCurve(pts: Pt[], tension = 1): string {
  const n = pts.length;
  if (n < 3) return '';
  let d = `M${r2(pts[0][0])},${r2(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension;
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension;
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension;
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension;
    d += `C${r2(c1x)},${r2(c1y)} ${r2(c2x)},${r2(c2y)} ${r2(p2[0])},${r2(p2[1])}`;
  }
  return d + 'Z';
}

/** Open Catmull-Rom spline through points → SVG path. */
export function openCurve(pts: Pt[], tension = 1): string {
  const n = pts.length;
  if (n === 0) return '';
  if (n === 1) return `M${r2(pts[0][0])},${r2(pts[0][1])}`;
  let d = `M${r2(pts[0][0])},${r2(pts[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension;
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension;
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension;
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension;
    d += `C${r2(c1x)},${r2(c1y)} ${r2(c2x)},${r2(c2y)} ${r2(p2[0])},${r2(p2[1])}`;
  }
  return d;
}

export interface Peak {
  cx: number;
  cy: number;
  /** radius of the innermost ring */
  r0: number;
  /** spacing between rings */
  step: number;
  levels: number;
}

/**
 * Coherent contour rings around a peak: every ring shares harmonics (phases) so the
 * lines read as one landform, with wobble growing outward like real terrain.
 */
export function contourRings(seed: number | string, peak: Peak, samples = 56): string[] {
  const rnd = seeded(seed);
  const harmonics = [2, 3, 5].map((k) => ({ k, phase: rnd() * Math.PI * 2, amp: 0.08 + rnd() * 0.12 }));
  const stretch = 0.75 + rnd() * 0.5;
  const tilt = rnd() * Math.PI;
  const rings: string[] = [];
  for (let level = 0; level < peak.levels; level++) {
    const base = peak.r0 + level * peak.step;
    const pts: Pt[] = [];
    for (let i = 0; i < samples; i++) {
      const th = (i / samples) * Math.PI * 2;
      let w = 1;
      for (const h of harmonics) w += h.amp * (0.4 + level / peak.levels) * Math.sin(h.k * th + h.phase + level * 0.07);
      const r = base * w;
      const x = Math.cos(th) * r * stretch;
      const y = Math.sin(th) * r;
      pts.push([peak.cx + x * Math.cos(tilt) - y * Math.sin(tilt), peak.cy + x * Math.sin(tilt) + y * Math.cos(tilt)]);
    }
    rings.push(closedCurve(pts));
  }
  return rings;
}

/** A small landscape: 1–3 peaks scattered in a w×h box, each with rings. */
export function terrain(seed: string, w: number, h: number, density = 1): { d: string; level: number; peak: number }[] {
  const rnd = seeded(seed + ':terrain');
  const peaks = 1 + Math.floor(rnd() * 2.4);
  const out: { d: string; level: number; peak: number }[] = [];
  for (let p = 0; p < peaks; p++) {
    const cx = w * (0.15 + rnd() * 0.7);
    const cy = h * (0.15 + rnd() * 0.7);
    const size = Math.max(w, h);
    const levels = Math.round((7 + rnd() * 6) * density);
    const rings = contourRings(`${seed}:${p}`, {
      cx,
      cy,
      r0: size * (0.015 + rnd() * 0.03),
      step: size * (0.045 + rnd() * 0.03),
      levels,
    });
    rings.forEach((d, level) => out.push({ d, level, peak: p }));
  }
  return out;
}

/** Peak coordinates for a seed (used to plant a summit marker on covers). */
export function summitOf(seed: string, w: number, h: number): Pt {
  const rnd = seeded(seed + ':terrain');
  rnd();
  return [w * (0.15 + rnd() * 0.7), h * (0.15 + rnd() * 0.7)];
}

/** Fake-but-stable expedition coordinates around the Caucasus for meta labels. */
export function coordsOf(seed: string): string {
  const rnd = seeded(seed + ':coords');
  const lat = 40 + rnd() * 1.6;
  const lon = 46 + rnd() * 4.2;
  const fmt = (v: number) => {
    const d = Math.floor(v);
    const m = Math.floor((v - d) * 60);
    return `${d}°${String(m).padStart(2, '0')}′`;
  };
  return `${fmt(lat)}N ${fmt(lon)}E`;
}

/** Stable "altitude" in metres for a seed, e.g. for cover meta. */
export function altitudeOf(seed: string, min = 900, max = 4400): number {
  const rnd = seeded(seed + ':alt');
  return Math.round((min + rnd() * (max - min)) / 10) * 10;
}

export const TONES = ['signal', 'ember', 'aurora', 'glacier', 'moss'] as const;
export type Tone = (typeof TONES)[number];

/** Deterministic tone for a category/label. */
export function toneOf(key: string | null | undefined): Tone {
  if (!key) return 'glacier';
  return TONES[hashString(key.toLowerCase()) % TONES.length];
}

export const toneVar = (t: Tone) => `var(--${t})`;
