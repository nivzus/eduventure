import { BadRequestException } from '@nestjs/common';
import Papa from 'papaparse';
import { NormalizedQuestion, normalizeQuestion, parseQuestionType } from './question-engine';

/**
 * CSV columns (header row required):
 *   text, type, options, correctAnswers, explanation, points   [+ optional: tags, difficulty, imageUrl]
 * - options / correctAnswers / tags are `|`-separated (legacy `;` also accepted)
 * - type: SINGLE|MULTIPLE|TEXT|TRUE_FALSE|ORDERING|FILL_BLANKS|OPEN (legacy single/multiple/textInput/trueFalse/ordering/fillInTheBlanks/open ok)
 * - SINGLE/MULTIPLE correctAnswers: option text (preferred) or 1-based option number
 * - TEXT: accepted variants · TRUE_FALSE: true/false/doğru/yanlış
 * - ORDERING: options in the correct order (correctAnswers ignored)
 * - FILL_BLANKS: one entry per blank; variants inside a blank separated by `/`  e.g. "goes|went/has gone"
 */
export interface CsvRowError {
  row: number;
  message: string;
}

export interface ParsedCsvQuestion extends NormalizedQuestion {
  difficulty: number;
}

export const CSV_HEADERS = ['text', 'type', 'options', 'correctAnswers', 'explanation', 'points'] as const;

function splitList(raw: string | undefined): string[] {
  const s = (raw ?? '').trim();
  if (!s) return [];
  const sep = s.includes('|') ? '|' : s.includes(';') ? ';' : '|';
  return s
    .split(sep)
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

export function parseQuestionsCsv(buffer: Buffer | undefined): { questions: ParsedCsvQuestion[]; errors: CsvRowError[] } {
  if (!buffer || buffer.length === 0) throw new BadRequestException('CSV faylı tələb olunur (multipart "file")');
  const text = buffer.toString('utf8').replace(/^﻿/, '');
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });
  const fields = (parsed.meta.fields ?? []).map((f) => f.trim());
  const lower = fields.map((f) => f.toLowerCase());
  const missing = ['text', 'type'].filter((h) => !lower.includes(h));
  if (missing.length) {
    throw new BadRequestException(`CSV başlıqları çatışmır: ${missing.join(', ')}. Tələb olunan: ${CSV_HEADERS.join(', ')}`);
  }
  const get = (row: Record<string, string>, key: string): string | undefined => {
    const k = fields.find((f) => f.toLowerCase() === key.toLowerCase());
    return k ? row[k] : undefined;
  };

  const questions: ParsedCsvQuestion[] = [];
  const errors: CsvRowError[] = [];
  parsed.data.forEach((row, i) => {
    const rowNo = i + 2; // header is row 1
    try {
      const type = parseQuestionType(get(row, 'type'));
      if (!type) throw new BadRequestException(`naməlum tip "${get(row, 'type') ?? ''}"`);
      const options = splitList(get(row, 'options'));
      const answers = splitList(get(row, 'correctAnswers'));
      let correct: unknown = null;
      switch (type) {
        case 'SINGLE':
        case 'MULTIPLE': {
          const idx = answers
            .map((a) => {
              const byText = options.findIndex((o) => o.toLowerCase() === a.toLowerCase());
              if (byText >= 0) return byText;
              return /^\d+$/.test(a) ? Number(a) - 1 : -1;
            })
            .filter((n) => n >= 0);
          correct = type === 'SINGLE' ? { index: idx[0] } : { indices: idx };
          break;
        }
        case 'TEXT':
          correct = { answers };
          break;
        case 'TRUE_FALSE':
          correct = { value: answers[0] ?? '' };
          break;
        case 'FILL_BLANKS':
          correct = { blanks: answers.map((a) => a.split('/').map((s) => s.trim()).filter(Boolean)) };
          break;
        default:
          correct = null;
      }
      const q = normalizeQuestion(
        {
          type,
          text: get(row, 'text'),
          options,
          correct,
          explanation: get(row, 'explanation'),
          points: get(row, 'points') || 1,
          tags: splitList(get(row, 'tags')),
          imageUrl: get(row, 'imageUrl'),
        },
        `Sətir ${rowNo}`,
      );
      const difficulty = Math.min(3, Math.max(1, Number(get(row, 'difficulty')) || 1));
      questions.push({ ...q, difficulty });
    } catch (e) {
      const msg = e instanceof BadRequestException ? String((e.getResponse() as { message?: string }).message ?? e.message) : (e as Error).message;
      errors.push({ row: rowNo, message: msg });
    }
  });
  return { questions, errors };
}
