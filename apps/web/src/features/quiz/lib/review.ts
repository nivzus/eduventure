import type { AnswerValue, Question, QuestionResult } from '../types';
import { answerToText, readCorrect } from './utils';

/** Human-readable correct answer for any question type ('' when not revealed / OPEN). */
export function correctText(q: Question): string {
  const c = readCorrect(q.type, q.correct, q);
  if (!c) return '';
  switch (q.type) {
    case 'SINGLE':
      return c.index != null ? q.options[c.index] ?? '' : '';
    case 'MULTIPLE':
      return (c.indices ?? []).map((i) => q.options[i]).filter(Boolean).join(', ');
    case 'TEXT':
      return (c.answers ?? []).join(' / ');
    case 'TRUE_FALSE':
      return c.value ? 'Doğru' : 'Yanlış';
    case 'ORDERING':
      return (c.order ?? q.options).join(' → ');
    case 'FILL_BLANKS':
      return (c.blanks ?? []).map((b, i) => `${i + 1}) ${b.join(' / ')}`).join('   ');
    default:
      return '';
  }
}

export type Verdict = 'correct' | 'wrong' | 'partial' | 'pending' | 'skipped';

export function verdictOf(r: QuestionResult | undefined, answer: AnswerValue): Verdict {
  if (!r) return answer == null ? 'skipped' : 'pending';
  if (r.correct === null) return 'pending';
  if (r.correct) return 'correct';
  if (r.points > 0) return 'partial';
  return answer == null || (Array.isArray(answer) && answer.length === 0) || answer === '' ? 'skipped' : 'wrong';
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  correct: 'Düzgün',
  wrong: 'Səhv',
  partial: 'Qismən',
  pending: 'Yoxlanılır',
  skipped: 'Cavabsız',
};

export function userAnswerText(q: Question, a: AnswerValue): string {
  if (a === undefined || a === null || (Array.isArray(a) && a.length === 0) || a === '') return '—';
  return answerToText(q, a) || '—';
}
