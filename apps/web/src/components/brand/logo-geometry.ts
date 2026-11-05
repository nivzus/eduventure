/**
 * Eduventure logo geometry — single source of truth for <Logo/> and the static
 * files in /public/brand.
 *
 * The wordmark is a monoline "trail" alphabet: every glyph is a centre-line path
 * stroked at STROKE units with round caps/joins (so it can be drawn in like a
 * trail with pathLength). Grid: ascender top 0, x-height 12, baseline 40.
 *
 * The "Compass E": the E's middle arm is a compass needle pointing East —
 * forward. It is the monogram, and the first letter of the wordmark.
 */

export const STROKE = 7;

const BASE = 37; // baseline centre-line
const XH = 15; // x-height centre-line
const CY = 26; // bowl centre
const R = 11; // bowl centre-line radius

type Glyph = { d: string; w: number; sharp?: boolean };

const f = (n: number) => Math.round(n * 100) / 100;

/** Compass-E body (spine + top/bottom arms). */
export const E_BODY = 'M23 3H10A7 7 0 0 0 3 10V30A7 7 0 0 0 10 37H23';
/** Needle facets (pivot at the spine, tip pointing East). */
export const NEEDLE_UPPER = 'M1 20L9.5 13L33 20Z';
export const NEEDLE_LOWER = 'M1 20L33 20L9.5 27Z';
export const NEEDLE = 'M1 20L9.5 13L33 20L9.5 27Z';

const glyphs: Record<string, (x: number) => Glyph> = {
  d: (x) => {
    const cx = x + 3 + R;
    return {
      d: `M${cx} ${CY - R}A${R} ${R} 0 1 0 ${cx} ${CY + R}A${R} ${R} 0 1 0 ${cx} ${CY - R}ZM${cx + R} 3V${BASE}`,
      w: 28,
    };
  },
  u: (x) => ({
    d: `M${x + 3} ${XH}V${CY}A${R} ${R} 0 0 0 ${x + 25} ${CY}M${x + 25} ${XH}V${BASE}`,
    w: 28,
  }),
  // the only sharp vertex in the alphabet: a valley that echoes the needle
  v: (x) => ({ d: `M${x + 3} ${XH}L${x + 15} 34L${x + 27} ${XH}`, w: 30, sharp: true }),
  e: (x) => {
    const cx = x + 3 + R;
    const a = (38 * Math.PI) / 180;
    return {
      d: `M${x + 3} ${CY}H${x + 25}A${R} ${R} 0 1 0 ${f(cx + R * Math.cos(a))} ${f(CY + R * Math.sin(a))}`,
      w: 28,
    };
  },
  n: (x) => ({
    d: `M${x + 3} ${XH}V${BASE}M${x + 3} ${CY}A${R} ${R} 0 0 1 ${x + 25} ${CY}V${BASE}`,
    w: 28,
  }),
  t: (x) => ({
    d: `M${x + 9} 5V${BASE - 8}A8 8 0 0 0 ${x + 17} ${BASE}H${x + 19}M${x + 3} ${XH}H${x + 19}`,
    w: 22,
  }),
  r: (x) => ({
    d: `M${x + 3} ${XH}V${BASE}M${x + 3} ${CY}A${R} ${R} 0 0 1 ${x + 14} ${XH}H${x + 17}`,
    w: 20,
  }),
};

/** Optical kerning: gap (in units) placed *before* each letter of "duventure". */
const KERN: [string, number][] = [
  ['d', 4],
  ['u', 6],
  ['v', 4.5],
  ['e', 4.5],
  ['n', 6],
  ['t', 4.5],
  ['u', 4],
  ['r', 6],
  ['e', 3.5],
];

/** Start of the lowercase run, after the Compass-E (needle tip at x=31). */
const E_ADVANCE = 30;

export const WORD_GLYPHS: { d: string; sharp: boolean }[] = (() => {
  let x = E_ADVANCE;
  const out: { d: string; sharp: boolean }[] = [];
  for (const [ch, gap] of KERN) {
    x += gap;
    const g = glyphs[ch](x);
    out.push({ d: g.d, sharp: !!g.sharp });
    x += g.w;
  }
  return out;
})();

export const WORD_WIDTH: number = (() => {
  let x = E_ADVANCE;
  for (const [ch, gap] of KERN) x += gap + glyphs[ch](0).w;
  return x;
})();

/** viewBoxes include half-stroke + round-join overshoot. */
export const VIEWBOX_FULL = `-1.5 -1.5 ${f(WORD_WIDTH + 3)} 44`;
export const VIEWBOX_MARK = '-5 -1.5 43 43';
