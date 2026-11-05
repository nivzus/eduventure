import { Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser('id') userId: string, @Query('limit') limit?: string) {
    return this.notifications.list(userId, limit ? Number(limit) || 50 : 50);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser('id') userId: string) {
    return this.notifications.unreadCount(userId);
  }

  @Patch(':id/read')
  markRead(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.notifications.markRead(userId, id);
  }

  @Post('read-all')
  markAllRead(@CurrentUser('id') userId: string) {
    return this.notifications.markAllRead(userId);
  }

  @Delete()
  clear(@CurrentUser('id') userId: string) {
    return this.notifications.clear(userId);
  }
}
