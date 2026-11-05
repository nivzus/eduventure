'use client';

import confetti from 'canvas-confetti';

const COLORS_DARK = ['#E8FF59', '#9B7BFF', '#FF6B3D', '#7CE7FF', '#F4F1EA'];
const COLORS_LIGHT = ['#1A1A22', '#6B4BFF', '#E8542A', '#0A8FB5', '#E8FF59'];

function reduced() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
function palette() {
  return typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light' ? COLORS_LIGHT : COLORS_DARK;
}

export type ConfettiKind = 'burst' | 'summit' | 'sides' | 'stars';

/**
 * fireConfetti()                 — center burst
 * fireConfetti({ kind: 'summit' }) — big 2-wave celebration (quiz passed / level up)
 * fireConfetti({ kind: 'sides' })  — cannons from both edges
 * fireConfetti({ origin: { x, y } }) — from a point (0–1 viewport coords)
 */
export function fireConfetti(opts: { kind?: ConfettiKind; origin?: { x: number; y: number }; particleCount?: number } = {}) {
  if (typeof window === 'undefined' || reduced()) return;
  const colors = palette();
  const base = { colors, disableForReducedMotion: true, zIndex: 10000, ticks: 220 };
  const kind = opts.kind ?? 'burst';

  if (kind === 'sides') {
    const end = Date.now() + 900;
    (function frame() {
      confetti({ ...base, particleCount: 4, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } });
      confetti({ ...base, particleCount: 4, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
    return;
  }
  if (kind === 'stars') {
    confetti({ ...base, particleCount: opts.particleCount ?? 40, spread: 360, startVelocity: 22, gravity: 0.4, scalar: 1.1, shapes: ['star'], origin: opts.origin ?? { x: 0.5, y: 0.4 } });
    return;
  }
  if (kind === 'summit') {
    const origin = opts.origin ?? { x: 0.5, y: 0.55 };
    confetti({ ...base, particleCount: 90, spread: 70, startVelocity: 48, origin });
    setTimeout(() => confetti({ ...base, particleCount: 60, spread: 120, startVelocity: 32, scalar: 0.9, origin }), 220);
    setTimeout(() => confetti({ ...base, particleCount: 30, spread: 360, startVelocity: 18, gravity: 0.5, shapes: ['star'], origin }), 450);
    return;
  }
  confetti({ ...base, particleCount: opts.particleCount ?? 80, spread: 75, startVelocity: 38, origin: opts.origin ?? { x: 0.5, y: 0.6 } });
}
