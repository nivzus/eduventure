import { Injectable, NotFoundException } from '@nestjs/common';
import { AccessService } from '../../common/access/access.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthUser } from '../../common/types';
import { ContentService } from '../content/content.service';
import { ToggleBookmarkDto } from './dto/bookmark.dto';

@Injectable()
export class BookmarksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly content: ContentService,
  ) {}

  /** My bookmarks (newest first) with content summary; deleted / no-longer-visible content is skipped. */
  async list(user: AuthUser) {
    const rows = await this.prisma.bookmark.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
    const summaries = await this.content.summariesFor(rows);
    const out = [];
    for (const b of rows) {
      const content = summaries.get(`${b.contentType}:${b.contentId}`);
      if (!content) continue;
      const decision = await this.access.decide(user, b.contentType, {
        id: content.id,
        authorId: content.author?.id ?? '',
        status: content.status,
        visibility: content.visibility,
      });
      if (decision === 'FORBIDDEN') continue;
      out.push({ ...b, content, locked: decision === 'LOCKED' });
    }
    return out;
  }

  async toggle(user: AuthUser, dto: ToggleBookmarkDto) {
    const key = { userId_contentType_contentId: { userId: user.id, contentType: dto.contentType, contentId: dto.contentId } };
    const existing = await this.prisma.bookmark.findUnique({ where: key });
    if (existing) {
      await this.prisma.bookmark.delete({ where: key });
      return { bookmarked: false };
    }
    const meta = await this.content.meta(dto.contentType, dto.contentId);
    if (!meta || (await this.access.decide(user, dto.contentType, meta)) === 'FORBIDDEN') {
      throw new NotFoundException('Məzmun tapılmadı');
    }
    await this.prisma.bookmark.upsert({
      where: key,
      create: { userId: user.id, contentType: dto.contentType, contentId: dto.contentId },
      update: {},
    });
    return { bookmarked: true };
  }
}
