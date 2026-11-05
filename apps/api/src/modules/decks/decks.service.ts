import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentType, Prisma, Visibility } from '@prisma/client';
import { AccessService, ListWhere } from '../../common/access/access.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthUser } from '../../common/types';
import { ContentService } from '../content/content.service';
import { GamificationService } from '../gamification/gamification.service';
import { CardInputDto, CreateDeckDto, DeckQueryDto, UpdateDeckDto } from './dto/deck.dto';
import { sm2 } from './sm2';

const T = ContentType.DECK;
const AUTHOR = { select: { id: true, name: true, avatarUrl: true } } as const;
const STUDY_LIMIT = 20;

const REVIEW_SELECT = {
  ease: true,
  interval: true,
  repetitions: true,
  dueAt: true,
  lastGrade: true,
  updatedAt: true,
} satisfies Prisma.FlashcardReviewSelect;

@Injectable()
export class DecksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly content: ContentService,
    private readonly gamification: GamificationService,
  ) {}

  /** cardCount / dueCount / newCount / reviewedCount per deck for one user. */
  private async counts(userId: string, deckIds: string[]) {
    const now = new Date();
    const [cards, reviews] = await Promise.all([
      this.prisma.flashcard.groupBy({ by: ['deckId'], where: { deckId: { in: deckIds } }, _count: { _all: true } }),
      this.prisma.flashcardReview.findMany({
        where: { userId, card: { deckId: { in: deckIds } } },
        select: { dueAt: true, card: { select: { deckId: true } } },
      }),
    ]);
    const out = new Map<string, { cardCount: number; dueCount: number; newCount: number; reviewedCount: number }>();
    for (const id of deckIds) out.set(id, { cardCount: 0, dueCount: 0, newCount: 0, reviewedCount: 0 });
    for (const c of cards) out.get(c.deckId)!.cardCount = c._count._all;
    for (const r of reviews) {
      const o = out.get(r.card.deckId);
      if (!o) continue;
      o.reviewedCount++;
      if (r.dueAt <= now) o.dueCount++;
    }
    for (const o of out.values()) o.newCount = Math.max(0, o.cardCount - o.reviewedCount);
    return out;
  }

  async list(user: AuthUser, q: DeckQueryDto) {
    const visible = (await this.access.listWhere(user, T)) as ListWhere;
    const filters: Prisma.FlashcardDeckWhereInput[] = [visible];
    if (q.q?.trim()) {
      const s = q.q.trim();
      filters.push({
        OR: [
          { title: { contains: s, mode: 'insensitive' } },
          { description: { contains: s, mode: 'insensitive' } },
          { cards: { some: { OR: [{ front: { contains: s, mode: 'insensitive' } }, { back: { contains: s, mode: 'insensitive' } }] } } },
        ],
      });
    }
    if (q.category) filters.push({ category: { equals: q.category, mode: 'insensitive' } });
    if (q.status) filters.push({ status: q.status });
    if (q.mine === '1' || q.mine === 'true') filters.push({ authorId: user.id });

    const rows = await this.prisma.flashcardDeck.findMany({
      where: { AND: filters },
      include: { author: AUTHOR },
      orderBy: { createdAt: 'desc' },
    });
    const [counts, locked] = await Promise.all([
      this.counts(
        user.id,
        rows.map((r) => r.id),
      ),
      this.content.lockedIds(user, T, rows),
    ]);
    return rows.map((r) => ({
      ...this.content.hidePasscode(user, r),
      ...counts.get(r.id)!,
      locked: locked.has(r.id),
    }));
  }

  private async getOrThrow(id: string) {
    const d = await this.prisma.flashcardDeck.findUnique({ where: { id } });
    if (!d) throw new NotFoundException('Kart dəsti tapılmadı');
    return d;
  }

  async detail(user: AuthUser, id: string, passcode?: string) {
    const deck = await this.getOrThrow(id);
    await this.access.assertCanView(user, T, deck, { passcode });
    const [author, cards, counts, bookmark, groupIds] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: deck.authorId }, ...AUTHOR }),
      this.prisma.flashcard.findMany({
        where: { deckId: id },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        include: { reviews: { where: { userId: user.id }, select: REVIEW_SELECT } },
      }),
      this.counts(user.id, [id]),
      this.prisma.bookmark.findUnique({
        where: { userId_contentType_contentId: { userId: user.id, contentType: T, contentId: id } },
      }),
      this.access.isOwner(user, deck) ? this.content.groupIdsOf(T, id) : Promise.resolve([] as string[]),
    ]);
    return {
      ...this.content.hidePasscode(user, deck),
      author,
      cards: cards.map(({ reviews, ...c }) => ({ ...c, review: reviews[0] ?? null })),
      ...counts.get(id)!,
      bookmarked: !!bookmark,
      groupIds,
      locked: false,
    };
  }

  /** Due cards (oldest first) then new cards (deck order), max 20. */
  async study(user: AuthUser, id: string, passcode?: string) {
    const deck = await this.getOrThrow(id);
    await this.access.assertCanView(user, T, deck, { passcode });
    const now = new Date();
    const cards = await this.prisma.flashcard.findMany({
      where: { deckId: id },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: { reviews: { where: { userId: user.id }, select: REVIEW_SELECT } },
    });
    const due = cards
      .filter((c) => c.reviews[0] && c.reviews[0].dueAt <= now)
      .sort((a, b) => a.reviews[0].dueAt.getTime() - b.reviews[0].dueAt.getTime());
    const fresh = cards.filter((c) => !c.reviews[0]);
    return [...due, ...fresh].slice(0, STUDY_LIMIT).map(({ reviews, ...c }) => ({
      ...c,
      isNew: !reviews[0],
      review: reviews[0] ?? null,
    }));
  }

  async review(user: AuthUser, cardId: string, grade: number, passcode?: string) {
    const card = await this.prisma.flashcard.findUnique({ where: { id: cardId }, include: { deck: true } });
    if (!card) throw new NotFoundException('Kart tapılmadı');
    await this.access.assertCanView(user, T, card.deck, { passcode });

    const now = new Date();
    const prev = await this.prisma.flashcardReview.findUnique({
      where: { userId_cardId: { userId: user.id, cardId } },
    });
    const next = sm2(prev ?? { ease: 2.5, interval: 0, repetitions: 0 }, grade, now);
    const saved = await this.prisma.flashcardReview.upsert({
      where: { userId_cardId: { userId: user.id, cardId } },
      create: { userId: user.id, cardId, ...next, lastGrade: grade },
      update: { ...next, lastGrade: grade },
    });

    // XP (1/card) only for cards that were actually due or new — re-grading the same card right away earns nothing.
    const earns = !prev || prev.dueAt <= now;
    const reward = earns
      ? await this.gamification.onEvent(user.id, { type: 'CARDS_REVIEWED', count: 1 })
      : { xpGained: 0, levelUp: false, newAchievements: [] };

    return {
      id: saved.id,
      cardId,
      deckId: card.deckId,
      ease: saved.ease,
      interval: saved.interval,
      repetitions: saved.repetitions,
      dueAt: saved.dueAt,
      lastGrade: saved.lastGrade,
      xpGained: reward.xpGained,
      levelUp: reward.levelUp,
      newAchievements: reward.newAchievements,
    };
  }

  // ───────────── writes ─────────────

  private async replaceCards(tx: Prisma.TransactionClient, deckId: string, cards: CardInputDto[]) {
    const existing = await tx.flashcard.findMany({ where: { deckId }, select: { id: true } });
    const existingIds = new Set(existing.map((c) => c.id));
    const keep = new Set(cards.map((c) => c.id).filter((id): id is string => !!id && existingIds.has(id)));
    const toDelete = [...existingIds].filter((id) => !keep.has(id));
    if (toDelete.length) await tx.flashcard.deleteMany({ where: { id: { in: toDelete } } });

    const seen = new Set<string>();
    for (const [order, c] of cards.entries()) {
      const data = { front: c.front.trim(), back: c.back.trim(), example: c.example?.trim() || null, order };
      if (c.id && keep.has(c.id) && !seen.has(c.id)) {
        seen.add(c.id);
        await tx.flashcard.update({ where: { id: c.id }, data });
      } else {
        await tx.flashcard.create({ data: { ...data, deckId } });
      }
    }
  }

  async create(user: AuthUser, dto: CreateDeckDto) {
    const visibility = dto.visibility ?? Visibility.PUBLIC;
    await this.content.validateVisibilityInput(visibility, dto.passcode, dto.groupIds);
    const created = await this.prisma.flashcardDeck.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        category: dto.category?.trim() || null,
        status: dto.status,
        visibility,
        passcode: dto.passcode?.trim() || null,
        authorId: user.id,
        cards: dto.cards?.length
          ? {
              create: dto.cards.map((c, order) => ({
                front: c.front.trim(),
                back: c.back.trim(),
                example: c.example?.trim() || null,
                order,
              })),
            }
          : undefined,
      },
    });
    await this.content.syncGroupAccess(T, created.id, visibility, dto.groupIds);
    return this.detail(user, created.id);
  }

  async update(user: AuthUser, id: string, dto: UpdateDeckDto) {
    const existing = await this.getOrThrow(id);
    this.access.assertCanEdit(user, existing);
    const visibility = dto.visibility ?? existing.visibility;
    const passcode = dto.passcode === undefined ? existing.passcode : dto.passcode?.trim() || null;
    await this.content.validateVisibilityInput(visibility, passcode, dto.groupIds);

    const data: Prisma.FlashcardDeckUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.category !== undefined) data.category = dto.category?.trim() || null;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.visibility !== undefined) data.visibility = dto.visibility;
    if (dto.passcode !== undefined) data.passcode = passcode;

    await this.prisma.$transaction(
      async (tx) => {
        await tx.flashcardDeck.update({ where: { id }, data });
        if (dto.cards !== undefined) await this.replaceCards(tx, id, dto.cards);
        if (passcode !== existing.passcode || visibility !== Visibility.PASSCODE) {
          await tx.contentUnlock.deleteMany({ where: { contentType: T, contentId: id } });
        }
      },
      { timeout: 30_000 },
    );
    if (dto.visibility !== undefined || dto.groupIds !== undefined) {
      await this.content.syncGroupAccess(T, id, visibility, dto.groupIds);
    }
    return this.detail(user, id);
  }

  async remove(user: AuthUser, id: string) {
    const existing = await this.getOrThrow(id);
    this.access.assertCanEdit(user, existing);
    await this.prisma.flashcardDeck.delete({ where: { id } });
    await this.content.cleanupAfterDelete(T, id);
    return { ok: true, id };
  }
}
