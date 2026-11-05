import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { QuestionType } from '@prisma/client';
import { env } from '../../common/env';
import { NormalizedQuestion, normalizeQuestion } from '../quizzes/question-engine';
import { GenerateQuestionsDto } from './dto/ai.dto';

export interface QuestionDraft extends NormalizedQuestion {
  difficulty: number;
  source: 'gemini' | 'mock';
}

const MODEL = 'gemini-2.5-flash';
const LEVEL_DIFFICULTY: Record<string, number> = { A1: 1, A2: 1, B1: 2, B2: 2, C1: 3, C2: 3, beginner: 1, intermediate: 2, advanced: 3 };

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  async generate(dto: GenerateQuestionsDto): Promise<QuestionDraft[]> {
    const count = Math.min(Math.max(dto.count ?? 5, 1), 20);
    const key = env.geminiKey;
    if (!key) return this.mock(dto.topic, count, dto.type, dto.level);
    const raw = await this.callGemini(key, dto.topic, count, dto.type, dto.level);
    const difficulty = this.difficultyFor(dto.level);
    const drafts: QuestionDraft[] = [];
    for (const [i, item] of raw.entries()) {
      try {
        const q = normalizeQuestion(item as Record<string, unknown>, `AI sual ${i + 1}`);
        if (dto.type && q.type !== dto.type) continue;
        drafts.push({ ...q, tags: q.tags.length ? q.tags : [dto.topic], difficulty, source: 'gemini' });
      } catch (e) {
        this.logger.warn(`Dropped invalid AI question: ${(e as Error).message}`);
      }
    }
    if (drafts.length === 0) throw new BadGatewayException('AI etibarlı sual qaytarmadı, yenidən cəhd edin');
    return drafts.slice(0, count);
  }

  private difficultyFor(level?: string): number {
    if (!level) return 2;
    return LEVEL_DIFFICULTY[level.trim()] ?? LEVEL_DIFFICULTY[level.trim().toUpperCase()] ?? 2;
  }

  private buildPrompt(topic: string, count: number, type?: QuestionType, level?: string): string {
    return [
      `You are an experienced English teacher creating quiz questions for Azerbaijani-speaking learners.`,
      `Topic: "${topic}". CEFR level: ${level ?? 'B1'}. Create exactly ${count} questions${type ? ` of type ${type}` : ' mixing types SINGLE, MULTIPLE, TEXT, TRUE_FALSE, FILL_BLANKS, ORDERING'}.`,
      `Question text in English (you may add a short Azerbaijani instruction). The "explanation" MUST be in Azerbaijani and explain the grammar rule briefly.`,
      `Return ONLY a JSON array. Each item: {"type","text","options","correct","explanation","points","tags"}.`,
      `Shapes: SINGLE → options: string[4], correct: {"index": n}. MULTIPLE → options: string[4-5], correct: {"indices": [..]}.`,
      `TEXT → options: [], correct: {"answers": [accepted variants]}. TRUE_FALSE → options: [], correct: {"value": true|false}.`,
      `ORDERING → options: words/sentences in the CORRECT order (they will be shuffled), correct: null.`,
      `FILL_BLANKS → text contains placeholders {{1}}, {{2}}…, options: [], correct: {"blanks": [["variant1","variant2"], ...]} one array per blank.`,
      `points: 1 (2 for harder). tags: 1-3 short English topic tags like "present-simple".`,
    ].join('\n');
  }

  private async callGemini(key: string, topic: string, count: number, type?: QuestionType, level?: string): Promise<unknown[]> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: this.buildPrompt(topic, count, type, level) }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
        }),
        signal: AbortSignal.timeout(60_000),
      });
    } catch (e) {
      throw new BadGatewayException(`AI xidmətinə qoşulmaq mümkün olmadı: ${(e as Error).message}`);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.error(`Gemini ${res.status}: ${body.slice(0, 500)}`);
      throw new BadGatewayException(`AI xidməti xəta qaytardı (${res.status})`);
    }
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    try {
      const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
      const parsed = JSON.parse(cleaned) as unknown;
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { questions?: unknown[] }).questions)) {
        return (parsed as { questions: unknown[] }).questions;
      }
    } catch {
      /* fallthrough */
    }
    throw new BadGatewayException('AI cavabı JSON formatında deyil');
  }

  /** Deterministic offline generator (same input → same output). */
  mock(topic: string, count: number, type?: QuestionType, level?: string): QuestionDraft[] {
    const t = topic.trim() || 'English grammar';
    const difficulty = this.difficultyFor(level);
    const pool = MOCK_POOL.filter((q) => !type || q.type === type);
    const seed = [...t].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
    const out: QuestionDraft[] = [];
    for (let i = 0; i < count; i++) {
      const base = pool[(seed + i) % pool.length];
      const q = normalizeQuestion({ ...base, tags: [t, ...(base.tags ?? [])] });
      out.push({ ...q, text: i >= pool.length ? `${q.text} (${Math.floor(i / pool.length) + 1})` : q.text, difficulty, source: 'mock' });
    }
    return out;
  }
}

interface MockItem {
  type: QuestionType;
  text: string;
  options?: string[];
  correct: unknown;
  explanation: string;
  points?: number;
  tags?: string[];
}

const MOCK_POOL: MockItem[] = [
  {
    type: 'SINGLE',
    text: 'Choose the correct form: She ___ to school every day.',
    options: ['go', 'goes', 'is go', 'going'],
    correct: { index: 1 },
    explanation: 'Present Simple-da üçüncü şəxs təkdə (he/she/it) feilə -s/-es əlavə olunur: she goes.',
    tags: ['present-simple'],
  },
  {
    type: 'MULTIPLE',
    text: 'Which of these words are irregular verbs?',
    options: ['go', 'play', 'eat', 'watch', 'write'],
    correct: { indices: [0, 2, 4] },
    explanation: 'Qaydasız feillərin keçmiş forması -ed ilə düzəlmir: go → went, eat → ate, write → wrote.',
    tags: ['irregular-verbs'],
  },
  {
    type: 'TEXT',
    text: 'Write the past simple form of "buy".',
    correct: { answers: ['bought'] },
    explanation: '"Buy" qaydasız feildir: buy – bought – bought.',
    tags: ['past-simple'],
  },
  {
    type: 'TRUE_FALSE',
    text: '"I have seen him yesterday" is grammatically correct.',
    correct: { value: false },
    explanation: 'Konkret keçmiş zaman göstəricisi (yesterday) ilə Present Perfect işlənmir; düzgün: "I saw him yesterday".',
    tags: ['present-perfect'],
  },
  {
    type: 'FILL_BLANKS',
    text: 'If it {{1}} tomorrow, we {{2}} at home.',
    correct: { blanks: [['rains'], ["will stay", "'ll stay"]] },
    explanation: 'First Conditional: If + Present Simple, will + feil. "If it rains, we will stay".',
    points: 2,
    tags: ['conditionals'],
  },
  {
    type: 'ORDERING',
    text: 'Put the words in the correct order to make a question.',
    options: ['Where', 'did', 'you', 'go', 'last', 'summer?'],
    correct: null,
    explanation: 'Past Simple sual cümləsi: Sual sözü + did + mübtəda + feilin I forması.',
    tags: ['word-order'],
  },
  {
    type: 'SINGLE',
    text: 'I am interested ___ learning new languages.',
    options: ['on', 'in', 'at', 'for'],
    correct: { index: 1 },
    explanation: '"Interested" sifəti həmişə "in" sözönü ilə işlənir: interested in something.',
    tags: ['prepositions'],
  },
  {
    type: 'FILL_BLANKS',
    text: 'There is {{1}} apple and {{2}} banana on the table.',
    correct: { blanks: [['an'], ['a']] },
    explanation: 'Sait səslə başlayan sözdən əvvəl "an", samit səslə başlayan sözdən əvvəl "a" işlənir.',
    tags: ['articles'],
  },
  {
    type: 'TEXT',
    text: 'Give the comparative form of "good".',
    correct: { answers: ['better'] },
    explanation: '"Good" qaydasız sifətdir: good – better – the best.',
    tags: ['comparatives'],
  },
  {
    type: 'TRUE_FALSE',
    text: '"Much" is used with uncountable nouns, e.g. "much water".',
    correct: { value: true },
    explanation: '"Much" sayılmayan isimlərlə (water, time, money), "many" isə sayılan isimlərlə işlənir.',
    tags: ['quantifiers'],
  },
];
