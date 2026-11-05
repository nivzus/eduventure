/**
 * Question engine — pure functions shared by quizzes, attempts, practice, bank and ai.
 *
 *  - normalizeQuestion(): validates/coerces author input into the canonical SPEC §2 shapes
 *  - viewQuestion():      per-attempt deterministic option shuffle (seeded by attemptId+questionId);
 *                         answers are always stored/graded in this "view" index space
 *  - sanitizeQuestion():  strips `correct`/`explanation` for students
 *  - gradeQuestion():     robust grading for all 7 types
 */
import { BadRequestException } from '@nestjs/common';
import { QuestionType } from '@prisma/client';

export type CorrectShape =
  | { index: number }
  | { indices: number[] }
  | { answers: string[] }
  | { value: boolean }
  | { blanks: string[][] }
  | null;

export interface QuestionLike {
  id: string;
  type: QuestionType;
  text: string;
  imageUrl?: string | null;
  options: unknown;
  correct: unknown;
  explanation?: string | null;
  points: number;
  tags?: string[];
  order?: number;
  quizId?: string;
}

export interface NormalizedQuestion {
  type: QuestionType;
  text: string;
  imageUrl: string | null;
  options: string[];
  correct: CorrectShape;
  explanation: string | null;
  points: number;
  tags: string[];
}

export interface ViewQuestion {
  id: string;
  quizId?: string;
  order: number;
  type: QuestionType;
  text: string;
  imageUrl: string | null;
  options: string[];
  correct: CorrectShape;
  explanation: string | null;
  points: number;
  tags: string[];
  /** FILL_BLANKS: number of `{{n}}` placeholders */
  blanks?: number;
  /** ORDERING: the items in the correct order (only exposed when revealed) */
  correctOrder?: string[];
}

export type SanitizedQuestion = Omit<ViewQuestion, 'correct' | 'explanation' | 'correctOrder'>;

export interface QuestionResult {
  correct: boolean | null;
  points: number;
  max: number;
}

// ───────────────────────────── helpers ─────────────────────────────

const LEGACY_TYPES: Record<string, QuestionType> = {
  single: 'SINGLE',
  radio: 'SINGLE',
  multiple: 'MULTIPLE',
  checkbox: 'MULTIPLE',
  text: 'TEXT',
  textinput: 'TEXT',
  text_input: 'TEXT',
  truefalse: 'TRUE_FALSE',
  true_false: 'TRUE_FALSE',
  ordering: 'ORDERING',
  order: 'ORDERING',
  fillintheblanks: 'FILL_BLANKS',
  fill_blanks: 'FILL_BLANKS',
  fillblanks: 'FILL_BLANKS',
  fill: 'FILL_BLANKS',
  open: 'OPEN',
  essay: 'OPEN',
};

export function parseQuestionType(raw: unknown): QuestionType | null {
  if (typeof raw !== 'string') return null;
  const up = raw.trim().toUpperCase();
  if ((Object.values(QuestionType) as string[]).includes(up)) return up as QuestionType;
  return LEGACY_TYPES[raw.trim().toLowerCase().replace(/[\s-]/g, '')] ?? LEGACY_TYPES[raw.trim().toLowerCase()] ?? null;
}

const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => (x === null || x === undefined ? '' : String(x))) : [];

const PLACEHOLDER_RE = /\{\{\s*(\d+)\s*\}\}/g;

/** Number of blanks in a FILL_BLANKS text (`{{1}}`, `{{2}}`, …). */
export function countBlanks(text: string): number {
  const nums = new Set<number>();
  for (const m of text.matchAll(PLACEHOLDER_RE)) nums.add(Number(m[1]));
  return nums.size;
}

/** Converts legacy `___` / `[blank]` gaps into `{{1}}`, `{{2}}` placeholders. */
export function convertLegacyBlanks(text: string): string {
  if (countBlanks(text) > 0) return text;
  let n = 0;
  return text.replace(/_{3,}|\[blank\]|\(\.\.\.\)/gi, () => `{{${++n}}}`);
}

/** Split accepted variants: "go|goes" or "go / goes". */
function splitVariants(s: string): string[] {
  return s
    .split(/\s*[|/]\s*/)
    .map((x) => x.trim())
    .filter(Boolean);
}

// ───────────────────────────── text normalisation ─────────────────────────────

const CONTRACTIONS: [RegExp, string][] = [
  [/\bcan't\b/g, 'can not'],
  [/\bcannot\b/g, 'can not'],
  [/\bwon't\b/g, 'will not'],
  [/\bshan't\b/g, 'shall not'],
  [/\bain't\b/g, 'is not'],
  [/n't\b/g, ' not'],
  [/\bi'm\b/g, 'i am'],
  [/'re\b/g, ' are'],
  [/'ve\b/g, ' have'],
  [/'ll\b/g, ' will'],
];

/** Case/space/punctuation-insensitive canonical form. Uses locale-independent lowercasing (keeps English "I" → "i"). */
export function normText(v: unknown): string {
  return String(v ?? '')
    .normalize('NFKC')
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/[–—]/g, '-')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim()
    .replace(/^[\s"'.,!?;:]+|[\s"'.,!?;:]+$/g, '')
    .trim();
}

function expandContractions(s: string): string {
  let out = s;
  for (const [re, rep] of CONTRACTIONS) out = out.replace(re, rep);
  return out.replace(/\s+/g, ' ').trim();
}

/** True when the user's text matches any accepted variant. */
export function textMatches(user: unknown, accepted: string[]): boolean {
  const u = normText(user);
  if (!u) return false;
  const ux = expandContractions(u);
  return accepted.some((a) => {
    const n = normText(a);
    return !!n && (n === u || expandContractions(n) === ux);
  });
}

// ───────────────────────────── normalisation (author input) ─────────────────────────────

export interface RawQuestionInput {
  type?: unknown;
  text?: unknown;
  imageUrl?: unknown;
  options?: unknown;
  correct?: unknown;
  explanation?: unknown;
  points?: unknown;
  tags?: unknown;
}

/** Validate + coerce author input to canonical shapes. Throws BadRequestException with an Azerbaijani message. */
export function normalizeQuestion(input: RawQuestionInput, label = 'Sual'): NormalizedQuestion {
  const type = parseQuestionType(input.type);
  if (!type) throw new BadRequestException(`${label}: naməlum sual tipi "${String(input.type)}"`);
  let text = String(input.text ?? '').trim();
  if (!text) throw new BadRequestException(`${label}: sual mətni boşdur`);
  let options = asStringArray(input.options).map((o) => o.trim());
  const points = Math.max(0, Math.min(1000, Math.round(Number(input.points ?? 1)) || 0)) || 1;
  const tags = [...new Set(asStringArray(input.tags).map((t) => t.trim()).filter(Boolean))];
  const imageUrl = typeof input.imageUrl === 'string' && input.imageUrl.trim() ? input.imageUrl.trim() : null;
  const explanation = typeof input.explanation === 'string' && input.explanation.trim() ? input.explanation.trim() : null;
  const raw = input.correct as unknown;
  let correct: CorrectShape = null;

  const needOptions = (min: number) => {
    options = options.filter((o) => o.length > 0);
    if (options.length < min) throw new BadRequestException(`${label}: ən azı ${min} variant olmalıdır`);
  };
  const idx = (v: unknown): number | null => {
    if (typeof v === 'number' && Number.isInteger(v)) return v;
    if (typeof v === 'string' && /^\d+$/.test(v.trim())) return Number(v.trim());
    return null;
  };

  switch (type) {
    case 'SINGLE': {
      needOptions(2);
      let i: number | null = null;
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        const r = raw as Record<string, unknown>;
        i = idx(r.index) ?? (Array.isArray(r.indices) ? idx(r.indices[0]) : null);
      } else if (Array.isArray(raw)) i = idx(raw[0]);
      else i = idx(raw);
      if (i === null || i < 0 || i >= options.length) throw new BadRequestException(`${label}: düzgün variant seçilməyib`);
      correct = { index: i };
      break;
    }
    case 'MULTIPLE': {
      needOptions(2);
      let arr: unknown[] = [];
      if (Array.isArray(raw)) arr = raw;
      else if (raw && typeof raw === 'object') {
        const r = raw as Record<string, unknown>;
        arr = Array.isArray(r.indices) ? r.indices : r.index !== undefined ? [r.index] : [];
      }
      const indices = [...new Set(arr.map(idx).filter((n): n is number => n !== null && n >= 0 && n < options.length))].sort(
        (a, b) => a - b,
      );
      if (indices.length === 0) throw new BadRequestException(`${label}: ən azı bir düzgün variant seçin`);
      correct = { indices };
      break;
    }
    case 'TEXT': {
      let answers: string[] = [];
      if (typeof raw === 'string') answers = splitVariants(raw);
      else if (Array.isArray(raw)) answers = asStringArray(raw);
      else if (raw && typeof raw === 'object') answers = asStringArray((raw as Record<string, unknown>).answers);
      answers = [...new Set(answers.map((a) => a.trim()).filter(Boolean))];
      if (answers.length === 0) throw new BadRequestException(`${label}: ən azı bir qəbul edilən cavab yazın`);
      correct = { answers };
      options = [];
      break;
    }
    case 'TRUE_FALSE': {
      let v: unknown = raw;
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) v = (raw as Record<string, unknown>).value;
      const b = coerceBoolean(v);
      if (b === null) throw new BadRequestException(`${label}: Doğru/Yanlış cavabı seçilməyib`);
      correct = { value: b };
      if (options.length !== 2) options = ['Doğru', 'Yanlış'];
      break;
    }
    case 'ORDERING': {
      needOptions(2);
      correct = null;
      break;
    }
    case 'FILL_BLANKS': {
      text = convertLegacyBlanks(text);
      const n = countBlanks(text);
      if (n === 0) throw new BadRequestException(`${label}: mətndə {{1}} kimi boşluq yoxdur`);
      let blanksRaw: unknown[] = [];
      if (Array.isArray(raw)) blanksRaw = raw;
      else if (raw && typeof raw === 'object') {
        const r = raw as Record<string, unknown>;
        blanksRaw = Array.isArray(r.blanks) ? r.blanks : Array.isArray(r.answers) ? r.answers : [];
      } else if (typeof raw === 'string') blanksRaw = raw.split('|').map((s) => s.trim());
      const blanks = blanksRaw.map((b) =>
        Array.isArray(b) ? [...new Set(asStringArray(b).map((s) => s.trim()).filter(Boolean))] : splitVariants(String(b ?? '')),
      );
      if (blanks.length !== n || blanks.some((b) => b.length === 0)) {
        throw new BadRequestException(`${label}: ${n} boşluq üçün ${n} cavab olmalıdır`);
      }
      correct = { blanks };
      options = options.filter(Boolean); // optional word bank
      break;
    }
    case 'OPEN':
      correct = null;
      options = [];
      break;
  }
  return { type, text, imageUrl, options, correct, explanation, points, tags };
}

export function coerceBoolean(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1 ? true : v === 0 ? false : null;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (['true', 'doğru', 'dogru', 'düz', 'duz', 'yes', 'bəli', '1', 't', 'd'].includes(s)) return true;
    if (['false', 'yanlış', 'yanlis', 'səhv', 'sehv', 'no', 'xeyr', '0', 'f', 'y'].includes(s)) return false;
  }
  return null;
}

// ───────────────────────────── seeded permutation ─────────────────────────────

function hashSeed(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic permutation of 0..n-1. `p[viewIndex] = originalIndex`. */
export function seededPermutation(n: number, seed: string, avoidIdentity = false): number[] {
  const rnd = mulberry32(hashSeed(seed));
  const p = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  if (avoidIdentity && n > 1 && p.every((v, i) => v === i)) p.push(p.shift() as number);
  return p;
}

/** Deterministic shuffle of an array (used for question order of smart/practice sets). */
export function seededShuffle<T>(arr: readonly T[], seed: string): T[] {
  return seededPermutation(arr.length, seed).map((i) => arr[i]);
}

// ───────────────────────────── view / sanitize ─────────────────────────────

/**
 * Question as presented inside a given attempt. When `shuffleOptions` is on, SINGLE/MULTIPLE options
 * (and FILL_BLANKS word banks) are permuted with a seed of `${seed}:${question.id}`, and `correct`
 * is remapped into that index space. ORDERING items are always shuffled unless `revealOrder`.
 */
export function viewQuestion(
  q: QuestionLike,
  opts: { seed?: string; shuffleOptions?: boolean; revealOrder?: boolean } = {},
): ViewQuestion {
  const options = asStringArray(q.options);
  const seed = `${opts.seed ?? 'static'}:${q.id}`;
  let viewOptions = options;
  let correct = (q.correct ?? null) as CorrectShape;
  let correctOrder: string[] | undefined;

  if ((q.type === 'SINGLE' || q.type === 'MULTIPLE') && opts.shuffleOptions && options.length > 1) {
    const p = seededPermutation(options.length, seed);
    viewOptions = p.map((i) => options[i]);
    const inv = (orig: number) => p.indexOf(orig);
    if (correct && 'index' in correct) correct = { index: inv(correct.index) };
    if (correct && 'indices' in correct) correct = { indices: correct.indices.map(inv).sort((a, b) => a - b) };
  } else if (q.type === 'FILL_BLANKS' && opts.shuffleOptions && options.length > 1) {
    viewOptions = seededPermutation(options.length, seed).map((i) => options[i]);
  } else if (q.type === 'ORDERING') {
    correctOrder = options;
    viewOptions = opts.revealOrder ? options : seededPermutation(options.length, seed, true).map((i) => options[i]);
  }

  return {
    id: q.id,
    quizId: q.quizId,
    order: q.order ?? 0,
    type: q.type,
    text: q.text,
    imageUrl: q.imageUrl ?? null,
    options: viewOptions,
    correct,
    explanation: q.explanation ?? null,
    points: q.points,
    tags: q.tags ?? [],
    ...(q.type === 'FILL_BLANKS' ? { blanks: countBlanks(q.text) } : {}),
    ...(correctOrder ? { correctOrder } : {}),
  };
}

export function sanitizeQuestion(v: ViewQuestion): SanitizedQuestion {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { correct, explanation, correctOrder, ...rest } = v;
  return rest;
}

/** Revealed form: ORDERING options in the correct order, everything else unchanged. */
export function revealQuestion(v: ViewQuestion): ViewQuestion {
  if (v.type === 'ORDERING' && v.correctOrder) return { ...v, options: v.correctOrder };
  return v;
}

/** Human/answer-shaped correct answer (what `check` returns as `correctAnswer`). */
export function correctAnswerOf(v: ViewQuestion): unknown {
  const c = v.correct;
  switch (v.type) {
    case 'SINGLE':
      return c && 'index' in c ? c.index : null;
    case 'MULTIPLE':
      return c && 'indices' in c ? c.indices : [];
    case 'TEXT':
      return c && 'answers' in c ? c.answers : [];
    case 'TRUE_FALSE':
      return c && 'value' in c ? c.value : null;
    case 'ORDERING':
      return v.correctOrder ?? v.options;
    case 'FILL_BLANKS':
      return c && 'blanks' in c ? c.blanks : [];
    default:
      return null;
  }
}

// ───────────────────────────── grading ─────────────────────────────

/** Is the answer empty (unanswered)? */
export function isBlankAnswer(answer: unknown): boolean {
  if (answer === undefined || answer === null) return true;
  if (typeof answer === 'string') return answer.trim() === '';
  if (Array.isArray(answer)) return answer.length === 0 || answer.every((a) => isBlankAnswer(a));
  if (typeof answer === 'object') return Object.values(answer as object).every((a) => isBlankAnswer(a));
  return false;
}

function toIndex(v: unknown, options: string[]): number | null {
  if (typeof v === 'number' && Number.isInteger(v)) return v;
  if (typeof v === 'string') {
    if (/^\d+$/.test(v.trim())) return Number(v.trim());
    const i = options.findIndex((o) => normText(o) === normText(v));
    return i >= 0 ? i : null;
  }
  return null;
}

function blanksFromAnswer(answer: unknown, n: number): string[] {
  if (Array.isArray(answer)) return answer.map((a) => (a === null || a === undefined ? '' : String(a)));
  if (answer && typeof answer === 'object') {
    const r = answer as Record<string, unknown>;
    const keys = Object.keys(r);
    const oneBased = keys.includes(String(n)) || (!keys.includes('0') && keys.length > 0);
    return Array.from({ length: n }, (_, i) => String(r[String(oneBased ? i + 1 : i)] ?? ''));
  }
  if (typeof answer === 'string') return n === 1 ? [answer] : answer.split('|');
  return [];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Grade one answer against a ViewQuestion (answer must be in the same view/index space). */
export function gradeQuestion(v: ViewQuestion, answer: unknown): QuestionResult {
  const max = v.points;
  const wrong: QuestionResult = { correct: false, points: 0, max };
  const right: QuestionResult = { correct: true, points: max, max };
  if (v.type === 'OPEN') return isBlankAnswer(answer) ? wrong : { correct: null, points: 0, max };
  if (isBlankAnswer(answer) && v.type !== 'TRUE_FALSE') return wrong;
  const c = v.correct;

  switch (v.type) {
    case 'SINGLE': {
      const a = toIndex(Array.isArray(answer) ? answer[0] : answer, v.options);
      return c && 'index' in c && a === c.index ? right : wrong;
    }
    case 'MULTIPLE': {
      if (!c || !('indices' in c)) return wrong;
      const arr = Array.isArray(answer) ? answer : [answer];
      const got = [...new Set(arr.map((x) => toIndex(x, v.options)).filter((x): x is number => x !== null))].sort((a, b) => a - b);
      const exp = [...c.indices].sort((a, b) => a - b);
      return got.length === exp.length && got.every((g, i) => g === exp[i]) ? right : wrong;
    }
    case 'TEXT':
      return c && 'answers' in c && textMatches(answer, c.answers) ? right : wrong;
    case 'TRUE_FALSE': {
      const b = coerceBoolean(answer);
      return b !== null && c && 'value' in c && b === c.value ? right : wrong;
    }
    case 'ORDERING': {
      const expected = v.correctOrder ?? [];
      if (!Array.isArray(answer) || answer.length !== expected.length) return wrong;
      const items = answer.map((x) =>
        typeof x === 'number' && Number.isInteger(x) && v.options[x] !== undefined ? v.options[x] : String(x ?? ''),
      );
      return items.every((it, i) => normText(it) === normText(expected[i])) ? right : wrong;
    }
    case 'FILL_BLANKS': {
      if (!c || !('blanks' in c)) return wrong;
      const n = c.blanks.length;
      const given = blanksFromAnswer(answer, n);
      let ok = 0;
      for (let i = 0; i < n; i++) if (textMatches(given[i], c.blanks[i])) ok++;
      if (ok === n) return right;
      return { correct: false, points: r2((max * ok) / n), max };
    }
    default:
      return wrong;
  }
}

/** Summarise per-question results into score/maxScore/percent. */
export function summarize(results: Record<string, QuestionResult>, passPercent: number) {
  const list = Object.values(results);
  const score = r2(list.reduce((s, r) => s + r.points, 0));
  const maxScore = r2(list.reduce((s, r) => s + r.max, 0));
  const percent = maxScore > 0 ? r2((score / maxScore) * 100) : 0;
  const pending = list.some((r) => r.correct === null);
  return { score, maxScore, percent, passed: percent >= passPercent, pending };
}
