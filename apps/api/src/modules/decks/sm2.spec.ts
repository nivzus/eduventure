import { sm2 } from './sm2';

const DAY = 86400000;
const now = new Date('2026-01-01T00:00:00Z');
const fresh = { ease: 2.5, interval: 0, repetitions: 0 };

describe('sm2', () => {
  it('"again" (0) resets reps, interval 0, due in 10 minutes, ease drops', () => {
    const r = sm2({ ease: 2.5, interval: 10, repetitions: 4 }, 0, now);
    expect(r).toMatchObject({ repetitions: 0, interval: 0, ease: 1.7 });
    expect(r.dueAt.getTime() - now.getTime()).toBe(10 * 60 * 1000);
  });
  it('"hard" (1) resets reps, interval 1 day', () => {
    const r = sm2({ ease: 2.5, interval: 10, repetitions: 4 }, 1, now);
    expect(r).toMatchObject({ repetitions: 0, interval: 1, ease: 2.18 });
    expect(r.dueAt.getTime() - now.getTime()).toBe(DAY);
  });
  it('"good" (2) progression 1 → 6 → round(6*ease)', () => {
    const r1 = sm2(fresh, 2, now);
    expect(r1).toMatchObject({ repetitions: 1, interval: 1, ease: 2.5 });
    const r2 = sm2(r1, 2, now);
    expect(r2).toMatchObject({ repetitions: 2, interval: 6, ease: 2.5 });
    const r3 = sm2(r2, 2, now);
    expect(r3).toMatchObject({ repetitions: 3, interval: 15 });
    expect(r3.dueAt.getTime() - now.getTime()).toBe(15 * DAY);
  });
  it('"easy" (3) raises ease by 0.1', () => expect(sm2(fresh, 3, now).ease).toBe(2.6));
  it('ease never drops below 1.3', () => {
    let s = { ...fresh, ease: 1.35 };
    for (let i = 0; i < 5; i++) s = sm2(s, 0, now);
    expect(s.ease).toBe(1.3);
  });
  it('clamps/rounds out-of-range grades', () => {
    expect(sm2(fresh, 9, now).ease).toBe(2.6); // → easy
    expect(sm2(fresh, -4, now).interval).toBe(0); // → again
  });
});
