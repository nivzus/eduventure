/**
 * Topographic geometry helpers for the "Night Expedition" brand.
 * Pure + deterministic (seeded), so SSR and client markup always match.
 */

export type Pt = readonly [number, number];

/** Small seeded PRNG (mulberry32). */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Catmull-Rom spline through points → cubic Bézier path data. */
export function smoothPath(pts: readonly Pt[], closed = false, tension = 1): string {
  const n = pts.length;
  if (n < 2) return '';
  const at = (i: number): Pt =>
    closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension;
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension;
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension;
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension;
    d += `C${r1(c1x)} ${r1(c1y)} ${r1(c2x)} ${r1(c2y)} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return closed ? `${d}Z` : d;
}

export interface RingOptions {
  cx: number;
  cy: number;
  /** horizontal radius of the outermost ring */
  rx: number;
  /** vertical radius of the outermost ring (flatten for perspective terrain) */
  ry: number;
  /** number of nested rings */
  count: number;
  seed?: number;
  /** 0–0.3 – how irregular each ring is */
  wobble?: number;
  /** scale of the innermost ring relative to the outermost (0–1) */
  inner?: number;
  /** summit offset: inner rings drift toward (cx+dx, cy+dy) */
  dx?: number;
  dy?: number;
  points?: number;
}

/**
 * Nested, never-crossing contour rings – the signature "hill" motif.
 * Returns outermost → innermost path strings.
 */
export function contourRings({
  cx,
  cy,
  rx,
  ry,
  count,
  seed = 7,
  wobble = 0.12,
  inner = 0.18,
  dx = 0,
  dy = 0,
  points = 36,
}: RingOptions): string[] {
  const rand = rng(seed);
  const harmonics = [2, 3, 5].map((k) => ({
    k,
    amp: (0.35 + rand() * 0.65) * wobble * (k === 2 ? 1 : k === 3 ? 0.6 : 0.3),
    phase: rand() * Math.PI * 2,
  }));
  const rings: string[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    const s = 1 - t * (1 - inner);
    // inner rings get slightly calmer + drift toward the summit
    const calm = 1 - t * 0.35;
    const ox = cx + dx * t;
    const oy = cy + dy * t;
    const pts: Pt[] = [];
    for (let j = 0; j < points; j++) {
      const a = (j / points) * Math.PI * 2;
      let f = 1;
      for (const h of harmonics) f += h.amp * calm * Math.sin(h.k * a + h.phase + t * 0.6);
      pts.push([ox + Math.cos(a) * rx * s * f, oy + Math.sin(a) * ry * s * f]);
    }
    rings.push(smoothPath(pts, true));
  }
  return rings;
}

/**
 * Open, roughly parallel contour lines across a band (terrain hatching).
 * Lines run left → right from x0 to x1, stacked from y0 downward by `gap`.
 */
export function contourLines(opts: {
  x0: number;
  x1: number;
  y0: number;
  gap: number;
  count: number;
  amp?: number;
  seed?: number;
  steps?: number;
}): string[] {
  const { x0, x1, y0, gap, count, amp = 4, seed = 3, steps = 10 } = opts;
  const rand = rng(seed);
  const ph1 = rand() * 6.28;
  const ph2 = rand() * 6.28;
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const pts: Pt[] = [];
    for (let j = 0; j <= steps; j++) {
      const u = j / steps;
      const x = x0 + (x1 - x0) * u;
      const y =
        y0 +
        i * gap +
        Math.sin(u * 5.2 + ph1 + i * 0.35) * amp +
        Math.sin(u * 11 + ph2 - i * 0.2) * amp * 0.35;
      pts.push([x, y]);
    }
    out.push(smoothPath(pts));
  }
  return out;
}

/** Concave four-point sparkle centred on (x, y). */
export function sparkle(x: number, y: number, r: number): string {
  const k = r * 0.18;
  return `M${x} ${y - r}C${x + k} ${y - k} ${x + k} ${y - k} ${x + r} ${y}C${x + k} ${y + k} ${x + k} ${y + k} ${x} ${y + r}C${x - k} ${y + k} ${x - k} ${y + k} ${x - r} ${y}C${x - k} ${y - k} ${x - k} ${y - k} ${x} ${y - r}Z`;
}

/** Rounded regular polygon (pointy-top when rotation = -90). */
export function roundedPolygon(
  cx: number,
  cy: number,
  r: number,
  sides: number,
  corner: number,
  rotationDeg = -90,
): string {
  const verts: Pt[] = [];
  for (let i = 0; i < sides; i++) {
    const a = ((rotationDeg + (360 / sides) * i) * Math.PI) / 180;
    verts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  let d = '';
  for (let i = 0; i < sides; i++) {
    const prev = verts[(i - 1 + sides) % sides];
    const cur = verts[i];
    const next = verts[(i + 1) % sides];
    const lp = Math.hypot(prev[0] - cur[0], prev[1] - cur[1]);
    const ln = Math.hypot(next[0] - cur[0], next[1] - cur[1]);
    const a: Pt = [cur[0] + ((prev[0] - cur[0]) * corner) / lp, cur[1] + ((prev[1] - cur[1]) * corner) / lp];
    const b: Pt = [cur[0] + ((next[0] - cur[0]) * corner) / ln, cur[1] + ((next[1] - cur[1]) * corner) / ln];
    d += `${i === 0 ? 'M' : 'L'}${r1(a[0])} ${r1(a[1])}Q${r1(cur[0])} ${r1(cur[1])} ${r1(b[0])} ${r1(b[1])}`;
  }
  return `${d}Z`;
}
