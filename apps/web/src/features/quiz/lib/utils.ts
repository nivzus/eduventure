import { hashString } from '@/lib/utils';
import { COVER_PALETTE, OPTION_LETTERS } from './constants';

export { errorMessage } from '@/lib/api';
export {
  formatClock,
  formatDate,
  formatDateTime,
  formatDuration,
  formatPercent,
  formatRelative,
  hashString,
} from '@/lib/utils';
import type {
  AnswerMap,
  AnswerValue,
  Attempt,
  AttemptBundle,
  AttemptQuizMeta,
  Question,
  QuestionType,
} from '../types';

/* ------------------------------------------------------------------ */
/* Seeded randomness — stable visuals & shuffles per id                */
/* ------------------------------------------------------------------ */

export function seededRandom(seed: string | number): () => number {
  let a = typeof seed === 'number' ? seed : hashString(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const rand = seededRandom(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  // Never hand the learner the solved order.
  if (out.length > 1 && out.every((v, i) => v === items[i])) {
    out.push(out.shift() as T);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Cover colours                                                       */
/* ------------------------------------------------------------------ */

const TOKEN_COLORS: Record<string, string> = {
  signal: '#E8FF59',
  lime: '#E8FF59',
  ember: '#FF6B3D',
  orange: '#FF6B3D',
  aurora: '#9B7BFF',
  violet: '#9B7BFF',
  purple: '#9B7BFF',
  glacier: '#7CE7FF',
  blue: '#7CE7FF',
  moss: '#4ADE80',
  green: '#4ADE80',
  dusk: '#FF7EB6',
  pink: '#FF7EB6',
  amber: '#FFC94D',
  yellow: '#FFC94D',
};

export function resolveCoverColor(color: string | null | undefined, seed: string): string {
  if (color) {
    const c = color.trim();
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)) return c;
    const token = TOKEN_COLORS[c.toLowerCase()];
    if (token) return token;
  }
  return COVER_PALETTE[hashString(seed) % COVER_PALETTE.length];
}

/** rgba() from hex for translucent washes. */
export function withAlpha(hex: string, alpha: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Layered gradient "night sky over terrain" for a quiz cover. */
export function coverBackground(color: string, seed: string): string {
  const rand = seededRandom(seed + ':bg');
  const x1 = Math.round(15 + rand() * 50);
  const y1 = Math.round(10 + rand() * 40);
  const x2 = Math.round(50 + rand() * 45);
  const y2 = Math.round(60 + rand() * 40);
  return [
    `radial-gradient(120% 90% at ${x1}% ${y1}%, ${withAlpha(color, 0.55)} 0%, ${withAlpha(color, 0.12)} 45%, transparent 70%)`,
    `radial-gradient(80% 80% at ${x2}% ${y2}%, ${withAlpha(color, 0.28)} 0%, transparent 60%)`,
    `linear-gradient(160deg, ${withAlpha(color, 0.18)} 0%, transparent 60%)`,
  ].join(', ');
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

export function formatTimeLimit(sec: number | null | undefined): string {
  if (!sec) return 'Limitsiz';
  const m = Math.round(sec / 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return rest ? `${h} saat ${rest} dəq` : `${h} saat`;
  }
  return `${m} dəq`;
}

export function formatPoints(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

export function letter(i: number): string {
  return OPTION_LETTERS[i] ?? String(i + 1);
}

/* ------------------------------------------------------------------ */
/* Text matching (mirrors the server rule: case/space-insensitive)     */
/* ------------------------------------------------------------------ */

export function normText(s: unknown): string {
  return String(s ?? '')
    .trim()
    .toLocaleLowerCase('az')
    .replace(/\s+/g, ' ');
}

export function textMatches(user: unknown, accepted: string[] | undefined): boolean {
  if (!accepted || accepted.length === 0) return false;
  const u = normText(user);
  if (!u) return false;
  return accepted.some((a) => normText(a) === u);
}

/* ------------------------------------------------------------------ */
/* FILL_BLANKS                                                         */
/* ------------------------------------------------------------------ */

export type BlankSegment = { kind: 'text'; value: string } | { kind: 'blank'; index: number; n: number };

const BLANK_RE = /\{\{\s*(\d+)\s*\}\}/g;

/** Splits "I {{1}} to school {{2}}." into text/blank segments. Blank index is n-1. */
export function parseBlanks(text: string): BlankSegment[] {
  const out: BlankSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(BLANK_RE)) {
    const start = m.index ?? 0;
    if (start > last) out.push({ kind: 'text', value: text.slice(last, start) });
    const n = parseInt(m[1], 10);
    out.push({ kind: 'blank', index: n - 1, n });
    last = start + m[0].length;
  }
  if (last < text.length) out.push({ kind: 'text', value: text.slice(last) });
  return out;
}

export function blankCount(text: string): number {
  let max = 0;
  for (const m of text.matchAll(BLANK_RE)) max = Math.max(max, parseInt(m[1], 10));
  return max;
}

/** Text with blanks replaced by "____" for compact previews. */
export function plainQuestionText(q: Pick<Question, 'type' | 'text'>): string {
  if (q.type === 'FILL_BLANKS') return q.text.replace(BLANK_RE, '____');
  return q.text;
}

/* ------------------------------------------------------------------ */
/* Correct answers                                                     */
/* ------------------------------------------------------------------ */

export interface CorrectView {
  index?: number;
  indices?: number[];
  answers?: string[];
  value?: boolean;
  order?: string[];
  blanks?: string[][];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Tolerant reader for `correct` JSON / `correctAnswer` from check endpoint. */
export function readCorrect(type: QuestionType, raw: unknown, question?: Question): CorrectView | null {
  const r = raw as any;
  switch (type) {
    case 'SINGLE': {
      if (typeof r === 'number') return { index: r };
      if (r && typeof r.index === 'number') return { index: r.index };
      if (r && Array.isArray(r.indices) && r.indices.length) return { index: r.indices[0] };
      if (typeof r === 'string' && question) {
        const i = question.options.indexOf(r);
        if (i >= 0) return { index: i };
      }
      return null;
    }
    case 'MULTIPLE': {
      if (Array.isArray(r) && r.every((x) => typeof x === 'number')) return { indices: r };
      if (r && Array.isArray(r.indices)) return { indices: r.indices };
      if (r && typeof r.index === 'number') return { indices: [r.index] };
      return null;
    }
    case 'TEXT': {
      if (typeof r === 'string') return { answers: [r] };
      if (Array.isArray(r)) return { answers: r.map(String) };
      if (r && Array.isArray(r.answers)) return { answers: r.answers.map(String) };
      return null;
    }
    case 'TRUE_FALSE': {
      if (typeof r === 'boolean') return { value: r };
      if (r && typeof r.value === 'boolean') return { value: r.value };
      if (r === 'true' || r === 'false') return { value: r === 'true' };
      return null;
    }
    case 'ORDERING': {
      if (Array.isArray(r) && r.every((x) => typeof x === 'string')) return { order: r };
      if (r && Array.isArray(r.order)) return { order: r.order };
      if (r && Array.isArray(r.items)) return { order: r.items };
      // Stored as null: options are already in the correct order (only meaningful when revealed).
      if (question && question.correct !== undefined) return { order: question.options };
      return null;
    }
    case 'FILL_BLANKS': {
      const fromArr = (arr: any[]) => arr.map((b) => (Array.isArray(b) ? b.map(String) : [String(b ?? '')]));
      if (Array.isArray(r)) return { blanks: fromArr(r) };
      if (r && Array.isArray(r.blanks)) return { blanks: fromArr(r.blanks) };
      return null;
    }
    case 'OPEN':
    default:
      return null;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** True when the server revealed the solution for this question. */
export function isRevealed(q: Question): boolean {
  if (q.type === 'OPEN') return false;
  if (q.type === 'ORDERING') return q.correct !== undefined;
  return q.correct !== undefined && q.correct !== null;
}

/* ------------------------------------------------------------------ */
/* Answers                                                             */
/* ------------------------------------------------------------------ */

export function isAnswered(q: Pick<Question, 'type'>, a: AnswerValue): boolean {
  if (a === undefined || a === null) return false;
  switch (q.type) {
    case 'SINGLE':
      return typeof a === 'number';
    case 'MULTIPLE':
      return Array.isArray(a) && a.length > 0;
    case 'TRUE_FALSE':
      return typeof a === 'boolean';
    case 'TEXT':
    case 'OPEN':
      return typeof a === 'string' && a.trim().length > 0;
    case 'ORDERING':
      return Array.isArray(a) && a.length > 0;
    case 'FILL_BLANKS':
      return Array.isArray(a) && a.some((x) => typeof x === 'string' && x.trim().length > 0);
    default:
      return false;
  }
}

export function answerToText(q: Question, a: AnswerValue): string {
  if (!isAnswered(q, a)) return 'Cavab verilməyib';
  switch (q.type) {
    case 'SINGLE':
      return `${letter(a as number)}. ${q.options[a as number] ?? '—'}`;
    case 'MULTIPLE':
      return (a as number[])
        .slice()
        .sort((x, y) => x - y)
        .map((i) => `${letter(i)}. ${q.options[i] ?? '—'}`)
        .join(' · ');
    case 'TRUE_FALSE':
      return a ? 'Doğru' : 'Yanlış';
    case 'ORDERING':
      return (a as string[]).map((x, i) => `${i + 1}. ${x}`).join('  →  ');
    case 'FILL_BLANKS':
      return (a as string[]).map((x) => x || '___').join(' · ');
    default:
      return String(a);
  }
}

export function wordCount(s: string): number {
  const t = s.trim();
  return t ? t.split(/\s+/).length : 0;
}

/* ------------------------------------------------------------------ */
/* Normalizers                                                         */
/* ------------------------------------------------------------------ */

/* eslint-disable @typescript-eslint/no-explicit-any */
function parseMaybeJson<T>(v: unknown, fallback: T): T {
  if (typeof v === 'string') {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }
  return (v as T) ?? fallback;
}

export function normalizeQuestion(raw: any): Question {
  const options = parseMaybeJson<unknown[]>(raw?.options, []);
  const q: Question = {
    id: String(raw?.id ?? ''),
    quizId: raw?.quizId,
    order: raw?.order,
    type: (raw?.type ?? 'SINGLE') as QuestionType,
    text: String(raw?.text ?? ''),
    imageUrl: raw?.imageUrl ?? null,
    options: Array.isArray(options) ? options.map((o) => String(o ?? '')) : [],
    explanation: raw?.explanation ?? null,
    points: typeof raw?.points === 'number' ? raw.points : 1,
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
  };
  if (raw && Object.prototype.hasOwnProperty.call(raw, 'correct')) {
    q.correct = parseMaybeJson(raw.correct, null);
  }
  return q;
}

export function normalizeAttempt(raw: any): Attempt {
  const a = { ...(raw ?? {}) };
  delete a.questions;
  return {
    ...a,
    id: String(a.id ?? ''),
    answers: parseMaybeJson<AnswerMap>(a.answers, {}) ?? {},
    questionOrder: parseMaybeJson<string[]>(a.questionOrder, []) ?? [],
    result: parseMaybeJson(a.result, null),
    score: Number(a.score ?? 0),
    maxScore: Number(a.maxScore ?? 0),
    percent: Number(a.percent ?? 0),
    passed: Boolean(a.passed),
    timeSpentSec: Number(a.timeSpentSec ?? 0),
    mode: a.mode ?? 'EXAM',
    status: a.status ?? 'IN_PROGRESS',
  } as Attempt;
}

/** Accepts `{attempt, quiz, questions}` or `attempt & {quiz, questions}`. */
export function normalizeAttemptBundle(raw: any): AttemptBundle {
  const hasWrapper = raw && typeof raw === 'object' && raw.attempt && typeof raw.attempt === 'object';
  const attemptRaw = hasWrapper ? raw.attempt : raw;
  const quizRaw = (hasWrapper ? raw.quiz : undefined) ?? attemptRaw?.quiz ?? {};
  const questionsRaw: any[] =
    (hasWrapper ? raw.questions : undefined) ?? attemptRaw?.questions ?? quizRaw?.questions ?? [];

  const attempt = normalizeAttempt(attemptRaw);
  const questions = questionsRaw.map(normalizeQuestion);

  const order = attempt.questionOrder;
  if (order.length) {
    const pos = new Map(order.map((id, i) => [id, i]));
    questions.sort((x, y) => (pos.get(x.id) ?? 1e9) - (pos.get(y.id) ?? 1e9));
  } else {
    questions.sort((x, y) => (x.order ?? 0) - (y.order ?? 0));
  }

  const quiz: AttemptQuizMeta = {
    id: String(quizRaw?.id ?? attempt.quizId ?? ''),
    title: String(quizRaw?.title ?? 'Test'),
    timeLimitSec: quizRaw?.timeLimitSec ?? null,
    showAnswers: quizRaw?.showAnswers ?? true,
    mode: (quizRaw?.mode ?? attempt.mode ?? 'EXAM') as AttemptQuizMeta['mode'],
    passPercent: quizRaw?.passPercent ?? undefined,
    category: quizRaw?.category ?? null,
    coverColor: quizRaw?.coverColor ?? null,
  };
  return { attempt: { ...attempt, quiz: { id: quiz.id, title: quiz.title } }, quiz, questions };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function percentTone(p: number | null | undefined): 'moss' | 'ember' | 'danger' | 'neutral' {
  if (p === null || p === undefined) return 'neutral';
  if (p >= 75) return 'moss';
  if (p >= 50) return 'ember';
  return 'danger';
}

export function errorStatus(err: unknown): number | undefined {
  const e = err as { status?: unknown; statusCode?: unknown };
  if (typeof e?.status === 'number') return e.status;
  if (typeof e?.statusCode === 'number') return e.statusCode;
  return undefined;
}
