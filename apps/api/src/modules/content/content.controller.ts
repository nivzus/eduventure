import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { AuthUser } from '../../common/types';
import { ContentService } from './content.service';
import { parseContentType } from './content.utils';
import { SetVisibilityDto, UnlockDto } from './dto/content.dto';

@Controller('content')
export class ContentController {
  constructor(private readonly content: ContentService) {}

  /** ADMIN: every piece of content with its visibility + allowed groups. */
  @Get('permissions')
  @Roles('ADMIN')
  permissions() {
    return this.content.permissions();
  }

  @Patch(':type/:id/visibility')
  @Roles('TEACHER', 'ADMIN')
  setVisibility(
    @CurrentUser() user: AuthUser,
    @Param('type') type: string,
    @Param('id') id: string,
    @Body() dto: SetVisibilityDto,
  ) {
    return this.content.setVisibility(user, parseContentType(type), id, dto);
  }

  @Post(':type/:id/unlock')
  unlock(@CurrentUser() user: AuthUser, @Param('type') type: string, @Param('id') id: string, @Body() dto: UnlockDto) {
    return this.content.unlock(user, parseContentType(type), id, dto.passcode);
  }
}
