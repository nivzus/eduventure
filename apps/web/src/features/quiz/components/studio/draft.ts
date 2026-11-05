import type { BankDraft, BankQuestion, Question, QuestionPayload, QuestionType } from '../../types';
import { blankCount, readCorrect } from '../../lib/utils';

/**
 * Editable, type-agnostic question draft. Keeps every type's answer state side by side so
 * switching the type in the editor doesn't throw away what the teacher already typed.
 */
export interface QDraft {
  key: string;
  id?: string;
  type: QuestionType;
  text: string;
  imageUrl?: string | null;
  /** SINGLE / MULTIPLE variants · ORDERING items (in correct order) · FILL_BLANKS optional word bank. */
  options: string[];
  index: number | null;
  indices: number[];
  answers: string[];
  value: boolean | null;
  blanks: string[][];
  explanation: string;
  points: number;
  tags: string[];
  difficulty: number;
}

let seq = 0;
export const newKey = () => `q${Date.now().toString(36)}${(seq++).toString(36)}`;

export function blankDraft(type: QuestionType = 'SINGLE'): QDraft {
  return {
    key: newKey(),
    type,
    text: type === 'FILL_BLANKS' ? 'I {{1}} to school every day.' : '',
    imageUrl: null,
    options: type === 'ORDERING' ? ['', '', ''] : ['', '', '', ''],
    index: null,
    indices: [],
    answers: [''],
    value: null,
    blanks: type === 'FILL_BLANKS' ? [['go']] : [],
    explanation: '',
    points: 1,
    tags: [],
    difficulty: 2,
  };
}

export function toDraft(q: Question | BankQuestion, keepId = true): QDraft {
  const base = blankDraft(q.type);
  const c = readCorrect(q.type, q.correct ?? null, q as Question);
  const options = [...(q.options ?? [])];
  const d: QDraft = {
    ...base,
    id: keepId ? q.id : undefined,
    text: q.text ?? '',
    imageUrl: q.imageUrl ?? null,
    options: q.type === 'SINGLE' || q.type === 'MULTIPLE' || q.type === 'ORDERING' || q.type === 'FILL_BLANKS' ? options : base.options,
    explanation: q.explanation ?? '',
    points: q.points || 1,
    tags: [...(q.tags ?? [])],
    difficulty: 'difficulty' in q && typeof q.difficulty === 'number' ? q.difficulty : 2,
  };
  if (c?.index !== undefined) d.index = c.index;
  if (c?.indices) d.indices = [...c.indices];
  if (c?.answers) d.answers = c.answers.length ? [...c.answers] : [''];
  if (c?.value !== undefined) d.value = c.value;
  if (c?.blanks) d.blanks = c.blanks.map((b) => [...b]);
  if (q.type === 'FILL_BLANKS') d.blanks = syncBlanks(d.text, d.blanks);
  return d;
}

/** Keeps `blanks` length in sync with the {{n}} placeholders in `text`. */
export function syncBlanks(text: string, blanks: string[][]): string[][] {
  const n = blankCount(text);
  return Array.from({ length: n }, (_, i) => blanks[i] ?? []);
}

/** Switch question type, seeding sensible defaults for the new type. */
export function changeType(d: QDraft, type: QuestionType): QDraft {
  const next: QDraft = { ...d, type };
  if ((type === 'SINGLE' || type === 'MULTIPLE' || type === 'ORDERING') && d.options.filter((o) => o.trim()).length < 2) {
    next.options = type === 'ORDERING' ? ['', '', ''] : ['', '', '', ''];
  }
  if (type === 'MULTIPLE' && !d.indices.length && d.index !== null) next.indices = [d.index];
  if (type === 'SINGLE' && d.index === null && d.indices.length) next.index = d.indices[0];
  if (type === 'FILL_BLANKS') {
    if (!blankCount(d.text)) next.text = d.text ? `${d.text.trim()} {{1}}` : 'I {{1}} to school every day.';
    next.blanks = syncBlanks(next.text, d.blanks);
    if (d.type !== 'FILL_BLANKS') next.options = [];
  }
  if (!next.answers.length) next.answers = [''];
  return next;
}

const clean = (arr: string[]) => arr.map((s) => s.trim()).filter(Boolean);

/** Returns a human error (Azerbaijani) or null when the draft is valid. */
export function validateDraft(d: QDraft): string | null {
  if (!d.text.trim()) return 'Sual mətni boşdur';
  const opts = d.options.map((o) => o.trim());
  switch (d.type) {
    case 'SINGLE':
    case 'MULTIPLE': {
      if (opts.length < 2) return 'Ən azı 2 variant olmalıdır';
      if (opts.some((o) => !o)) return 'Boş variant var — doldur və ya sil';
      if (new Set(opts.map((o) => o.toLowerCase())).size !== opts.length) return 'Eyni variant iki dəfə yazılıb';
      if (d.type === 'SINGLE' && (d.index === null || d.index < 0 || d.index >= opts.length)) return 'Düzgün variantı işarələ';
      if (d.type === 'MULTIPLE' && !d.indices.some((i) => i >= 0 && i < opts.length)) return 'Ən azı bir düzgün variant işarələ';
      return null;
    }
    case 'TEXT':
      return clean(d.answers).length ? null : 'Ən azı bir qəbul edilən cavab yaz';
    case 'TRUE_FALSE':
      return d.value === null ? 'Doğru və ya Yanlış seç' : null;
    case 'ORDERING':
      if (opts.length < 2) return 'Ən azı 2 element olmalıdır';
      return opts.some((o) => !o) ? 'Boş element var — doldur və ya sil' : null;
    case 'FILL_BLANKS': {
      const n = blankCount(d.text);
      if (!n) return 'Mətndə {{1}} kimi boşluq yoxdur';
      const b = syncBlanks(d.text, d.blanks);
      const missing = b.findIndex((v) => !clean(v).length);
      return missing >= 0 ? `{{${missing + 1}}} boşluğu üçün cavab yaz` : null;
    }
    case 'OPEN':
    default:
      return null;
  }
}

function payloadCore(d: QDraft) {
  const opts = d.options.map((o) => o.trim());
  let options: string[] = [];
  let correct: QuestionPayload['correct'] = null;
  switch (d.type) {
    case 'SINGLE':
      options = opts;
      correct = { index: d.index ?? 0 };
      break;
    case 'MULTIPLE':
      options = opts;
      correct = { indices: [...new Set(d.indices)].filter((i) => i < opts.length).sort((a, b) => a - b) };
      break;
    case 'TEXT':
      correct = { answers: clean(d.answers) };
      break;
    case 'TRUE_FALSE':
      options = ['Doğru', 'Yanlış'];
      correct = { value: Boolean(d.value) };
      break;
    case 'ORDERING':
      options = opts;
      correct = null;
      break;
    case 'FILL_BLANKS':
      options = clean(d.options);
      correct = { blanks: syncBlanks(d.text, d.blanks).map(clean) };
      break;
    case 'OPEN':
      correct = null;
  }
  return {
    type: d.type,
    text: d.text.trim(),
    imageUrl: d.imageUrl || null,
    options,
    correct,
    explanation: d.explanation.trim() || null,
    points: Math.max(1, Math.round(d.points || 1)),
    tags: [...new Set(clean(d.tags))],
  };
}

export function toPayload(d: QDraft, order: number): QuestionPayload {
  return { ...(d.id ? { id: d.id } : {}), order, ...payloadCore(d) };
}

export function toBankDraft(d: QDraft): BankDraft {
  return { ...(d.id ? { id: d.id } : {}), ...payloadCore(d), difficulty: d.difficulty };
}
