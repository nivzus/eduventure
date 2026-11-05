import { Injectable } from '@nestjs/common';
import { ContentType, Prisma, Visibility } from '@prisma/client';
import { AccessService, ListWhere } from '../../common/access/access.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthUser } from '../../common/types';
import { ContentService, ContentSummary } from '../content/content.service';

const LIMIT = 5;
const ORDER = { updatedAt: 'desc' } as const;

export interface SearchResult {
  quizzes: (ContentSummary & { locked: boolean })[];
  articles: (ContentSummary & { locked: boolean })[];
  courses: (ContentSummary & { locked: boolean })[];
  paths: (ContentSummary & { locked: boolean })[];
  decks: (ContentSummary & { locked: boolean })[];
}

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly content: ContentService,
  ) {}

  async search(user: AuthUser, raw: string | undefined): Promise<SearchResult> {
    const q = (raw ?? '').trim().slice(0, 100);
    if (!q) return { quizzes: [], articles: [], courses: [], paths: [], decks: [] };
    const has = { contains: q, mode: Prisma.QueryMode.insensitive };
    const sel = { id: true, authorId: true, visibility: true } as const;

    const [qw, aw, cw, pw, dw] = (await Promise.all(
      [ContentType.QUIZ, ContentType.ARTICLE, ContentType.COURSE, ContentType.PATH, ContentType.DECK].map((t) =>
        this.access.listWhere(user, t),
      ),
    )) as ListWhere[];

    const [quizzes, articles, courses, paths, decks] = await Promise.all([
      this.prisma.quiz.findMany({
        where: { AND: [qw, { OR: [{ title: has }, { description: has }, { category: has }, { tags: { has: q } }] }] },
        select: sel,
        orderBy: ORDER,
        take: LIMIT,
      }),
      this.prisma.article.findMany({
        where: {
          AND: [aw, { OR: [{ title: has }, { excerpt: has }, { category: has }, { content: has }, { tags: { has: q } }] }],
        },
        select: sel,
        orderBy: ORDER,
        take: LIMIT,
      }),
      this.prisma.course.findMany({
        where: { AND: [cw, { OR: [{ title: has }, { description: has }, { category: has }] }] },
        select: sel,
        orderBy: ORDER,
        take: LIMIT,
      }),
      this.prisma.learningPath.findMany({
        where: { AND: [pw, { OR: [{ title: has }, { description: has }] }] },
        select: sel,
        orderBy: ORDER,
        take: LIMIT,
      }),
      this.prisma.flashcardDeck.findMany({
        where: {
          AND: [
            dw,
            {
              OR: [
                { title: has },
                { description: has },
                { category: has },
                { cards: { some: { OR: [{ front: has }, { back: has }] } } },
              ],
            },
          ],
        },
        select: sel,
        orderBy: ORDER,
        take: LIMIT,
      }),
    ]);

    const shape = async (type: ContentType, rows: { id: string; authorId: string; visibility: Visibility }[]) => {
      const [sums, locked] = await Promise.all([
        this.content.summaries(
          type,
          rows.map((r) => r.id),
        ),
        this.content.lockedIds(user, type, rows),
      ]);
      return rows
        .map((r) => sums.get(r.id))
        .filter((s): s is ContentSummary => !!s)
        .map((s) => ({ ...s, locked: locked.has(s.id) }));
    };

    const [qs, as, cs, ps, ds] = await Promise.all([
      shape(ContentType.QUIZ, quizzes),
      shape(ContentType.ARTICLE, articles),
      shape(ContentType.COURSE, courses),
      shape(ContentType.PATH, paths),
      shape(ContentType.DECK, decks),
    ]);
    return { quizzes: qs, articles: as, courses: cs, paths: ps, decks: ds };
  }
}
