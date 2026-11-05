import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface NotifyPayload {
  /** e.g. 'ATTEMPT_GRADED' | 'ASSIGNMENT' | 'ACHIEVEMENT' | 'QUEST' | 'LEVEL_UP' | 'COMMENT' | 'GROUP' | 'SYSTEM' */
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Create one notification per user id (duplicates/empties ignored). Never throws. */
  async notify(userIds: string | string[], payload: NotifyPayload): Promise<number> {
    const ids = [...new Set((Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean))];
    if (ids.length === 0) return 0;
    try {
      const res = await this.prisma.notification.createMany({
        data: ids.map((userId) => ({
          userId,
          type: payload.type,
          title: payload.title,
          body: payload.body ?? null,
          link: payload.link ?? null,
        })),
      });
      return res.count;
    } catch {
      return 0;
    }
  }

  list(userId: string, limit = 50) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
    });
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({ where: { userId, readAt: null } });
    return { count };
  }

  async markRead(userId: string, id: string) {
    const n = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!n) throw new NotFoundException('Bildiriş tapılmadı');
    return this.prisma.notification.update({ where: { id }, data: { readAt: n.readAt ?? new Date() } });
  }

  async markAllRead(userId: string) {
    const res = await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    return { updated: res.count };
  }

  async clear(userId: string) {
    const res = await this.prisma.notification.deleteMany({ where: { userId } });
    return { deleted: res.count };
  }
}
