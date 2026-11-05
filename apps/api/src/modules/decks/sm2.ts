/**
 * SM-2 spaced repetition (same maths as the legacy FlashcardStudyPage).
 * API grades are 0..3 (again / hard / good / easy) and map onto SM-2 qualities 0, 2, 4, 5.
 */
export const GRADE_TO_QUALITY = [0, 2, 4, 5] as const;

export interface Sm2State {
  ease: number;
  interval: number; // days
  repetitions: number;
}

export interface Sm2Result extends Sm2State {
  dueAt: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const AGAIN_DELAY_MS = 10 * 60 * 1000; // "again" cards come back in 10 minutes

export function sm2(prev: Sm2State, grade: number, now = new Date()): Sm2Result {
  const quality = GRADE_TO_QUALITY[Math.max(0, Math.min(3, Math.round(grade)))];
  let { ease, interval, repetitions } = prev;

  if (quality < 3) {
    repetitions = 0;
    interval = grade === 0 ? 0 : 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.max(1, Math.round(interval * ease));
    repetitions += 1;
  }

  ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (ease < 1.3) ease = 1.3;
  ease = Math.round(ease * 100) / 100;

  const dueAt = new Date(now.getTime() + (interval === 0 ? AGAIN_DELAY_MS : interval * DAY_MS));
  return { ease, interval, repetitions, dueAt };
}
