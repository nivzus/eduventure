import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AuthUser } from '../../common/types';
import { BookmarksService } from './bookmarks.service';
import { ToggleBookmarkDto } from './dto/bookmark.dto';

@Controller('bookmarks')
export class BookmarksController {
  constructor(private readonly bookmarks: BookmarksService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.bookmarks.list(user);
  }

  @Post('toggle')
  @HttpCode(200)
  toggle(@CurrentUser() user: AuthUser, @Body() dto: ToggleBookmarkDto) {
    return this.bookmarks.toggle(user, dto);
  }
}
