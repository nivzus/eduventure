import {
  QuestionLike,
  countBlanks,
  gradeQuestion,
  normText,
  normalizeQuestion,
  summarize,
  textMatches,
  viewQuestion,
} from './question-engine';

const q = (over: Partial<QuestionLike>): QuestionLike => ({ id: 'q1', type: 'SINGLE', text: 'Q', options: [], correct: null, points: 1, ...over });
const grade = (over: Partial<QuestionLike>, answer: unknown) => gradeQuestion(viewQuestion(q(over)), answer);

describe('question-engine: gradeQuestion', () => {
  describe('SINGLE', () => {
    const base = { type: 'SINGLE' as const, options: ['lives', 'has lived', 'lived'], correct: { index: 1 }, points: 2 };
    it('accepts the correct index', () => expect(grade(base, 1)).toEqual({ correct: true, points: 2, max: 2 }));
    it('rejects a wrong index', () => expect(grade(base, 0)).toEqual({ correct: false, points: 0, max: 2 }));
    it('accepts numeric strings and option text', () => {
      expect(grade(base, '1').correct).toBe(true);
      expect(grade(base, ' Has  Lived ').correct).toBe(true);
    });
    it('treats blank as wrong', () => expect(grade(base, undefined).correct).toBe(false));
  });

  describe('MULTIPLE', () => {
    const base = { type: 'MULTIPLE' as const, options: ['already', 'yesterday', 'yet', 'ever'], correct: { indices: [0, 2, 3] } };
    it('order-insensitive exact set', () => expect(grade(base, [3, 0, 2]).correct).toBe(true));
    it('duplicates are ignored', () => expect(grade(base, [0, 2, 3, 3]).correct).toBe(true));
    it('missing one → wrong', () => expect(grade(base, [0, 2]).correct).toBe(false));
    it('extra one → wrong', () => expect(grade(base, [0, 1, 2, 3]).correct).toBe(false));
    it('empty → wrong', () => expect(grade(base, []).points).toBe(0));
  });

  describe('TEXT', () => {
    const base = { type: 'TEXT' as const, correct: { answers: ['went', 'did go'] } };
    it('is case-insensitive', () => expect(grade(base, 'WENT').correct).toBe(true));
    it('is space-insensitive (trim + collapse)', () => {
      expect(grade(base, '  went  ').correct).toBe(true);
      expect(grade(base, 'did    go').correct).toBe(true);
    });
    it('ignores trailing punctuation', () => expect(grade(base, 'went.').correct).toBe(true));
    it('accepts any variant', () => expect(grade(base, 'Did go').correct).toBe(true));
    it('rejects wrong text', () => expect(grade(base, 'goed').correct).toBe(false));
    it('rejects empty', () => expect(grade(base, '   ').correct).toBe(false));
    it('expands contractions', () => expect(textMatches("I've never been", ['I have never been'])).toBe(true));
    it('normText unifies quotes/dashes/case', () => expect(normText('  It’s   OK!  ')).toBe("it's ok"));
  });

  describe('TRUE_FALSE', () => {
    const base = { type: 'TRUE_FALSE' as const, correct: { value: false } };
    it('accepts boolean', () => expect(grade(base, false).correct).toBe(true));
    it('rejects opposite', () => expect(grade(base, true).correct).toBe(false));
    it('coerces strings (en/az)', () => {
      expect(grade(base, 'false').correct).toBe(true);
      expect(grade(base, 'Yanlış').correct).toBe(true);
      expect(grade({ ...base, correct: { value: true } }, 'doğru').correct).toBe(true);
    });
    it('unanswered → wrong', () => expect(grade(base, null).correct).toBe(false));
  });

  describe('ORDERING', () => {
    const base = { type: 'ORDERING' as const, options: ['Have', 'you', 'ever', 'tried', 'sushi?'] };
    it('view shuffles items (never identity) and keeps correctOrder', () => {
      const v = viewQuestion(q(base), { seed: 'attempt-1' });
      expect(v.options).not.toEqual(base.options);
      expect([...v.options].sort()).toEqual([...base.options].sort());
      expect(v.correctOrder).toEqual(base.options);
    });
    it('accepts items in the correct order (case-insensitive)', () => expect(grade(base, ['have', 'YOU', 'ever', 'tried', 'sushi?']).correct).toBe(true));
    it('rejects swapped items', () => expect(grade(base, ['you', 'Have', 'ever', 'tried', 'sushi?']).correct).toBe(false));
    it('rejects wrong length', () => expect(grade(base, ['Have', 'you']).correct).toBe(false));
    it('accepts view indices', () => {
      const v = viewQuestion(q(base), { seed: 's' });
      const idx = base.options.map((o) => v.options.indexOf(o));
      expect(gradeQuestion(v, idx).correct).toBe(true);
    });
  });

  describe('FILL_BLANKS', () => {
    const base = {
      type: 'FILL_BLANKS' as const,
      text: 'I {{1}} to London, but I {{2}} Paris.',
      correct: { blanks: [['have never been', "'ve never been"], ['visited']] },
      points: 2,
    };
    it('counts placeholders', () => expect(countBlanks(base.text)).toBe(2));
    it('array answer, all correct', () => expect(grade(base, ['have never been', 'visited'])).toEqual({ correct: true, points: 2, max: 2 }));
    it('accepts any variant per blank, case/space-insensitive', () => expect(grade(base, ["'VE never   been", ' Visited ']).correct).toBe(true));
    it('partial credit per blank', () => expect(grade(base, ['have never been', 'visit'])).toEqual({ correct: false, points: 1, max: 2 }));
    it('object answers keyed 1-based', () => expect(grade(base, { 1: 'have never been', 2: 'visited' }).correct).toBe(true));
    it('object answers keyed 0-based', () => expect(grade(base, { 0: 'have never been', 1: 'visited' }).correct).toBe(true));
    it('pipe-separated string', () => expect(grade(base, 'have never been|visited').correct).toBe(true));
    it('all wrong → 0', () => expect(grade(base, ['x', 'y']).points).toBe(0));
  });

  describe('OPEN', () => {
    const base = { type: 'OPEN' as const, points: 3 };
    it('non-empty answer → correct:null (manual review)', () => expect(grade(base, 'I went to the park.')).toEqual({ correct: null, points: 0, max: 3 }));
    it('empty answer → wrong', () => expect(grade(base, '  ')).toEqual({ correct: false, points: 0, max: 3 }));
  });
});

describe('question-engine: viewQuestion option shuffle', () => {
  it('remaps SINGLE/MULTIPLE correct indices into the shuffled view', () => {
    const options = ['a', 'b', 'c', 'd', 'e', 'f'];
    const single = viewQuestion(q({ options, correct: { index: 2 } }), { seed: 'x', shuffleOptions: true });
    expect(single.options[(single.correct as { index: number }).index]).toBe('c');
    const multi = viewQuestion(q({ type: 'MULTIPLE', options, correct: { indices: [0, 5] } }), { seed: 'x', shuffleOptions: true });
    expect((multi.correct as { indices: number[] }).indices.map((i) => multi.options[i]).sort()).toEqual(['a', 'f']);
  });
  it('is deterministic per seed', () => {
    const a = viewQuestion(q({ options: ['1', '2', '3', '4'] }), { seed: 's1', shuffleOptions: true });
    const b = viewQuestion(q({ options: ['1', '2', '3', '4'] }), { seed: 's1', shuffleOptions: true });
    expect(a.options).toEqual(b.options);
  });
});

describe('question-engine: summarize & normalizeQuestion', () => {
  it('summarizes score/percent/pass/pending', () => {
    const s = summarize(
      { a: { correct: true, points: 2, max: 2 }, b: { correct: false, points: 1, max: 2 }, c: { correct: null, points: 0, max: 1 } },
      60,
    );
    expect(s).toEqual({ score: 3, maxScore: 5, percent: 60, passed: true, pending: true });
  });
  it('normalizes TEXT variants from "a|b"', () => {
    const n = normalizeQuestion({ type: 'TEXT', text: 'Past of go?', correct: 'went | did go' } as never);
    expect(n.correct).toEqual({ answers: ['went', 'did go'] });
  });
  it('rejects unknown type', () => expect(() => normalizeQuestion({ type: 'NOPE', text: 'x' } as never)).toThrow());
});
