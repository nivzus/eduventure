import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { AuthUser } from '../../common/types';
import { Passcode } from '../content/passcode.decorator';
import { CreatePathDto, PathQueryDto, UpdatePathDto } from './dto/path.dto';
import { PathsService } from './paths.service';

@Controller('paths')
export class PathsController {
  constructor(private readonly paths: PathsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: PathQueryDto) {
    return this.paths.list(user, q);
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string, @Passcode() passcode?: string) {
    return this.paths.detail(user, id, passcode);
  }

  @Post()
  @Roles('TEACHER', 'ADMIN')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePathDto) {
    return this.paths.create(user, dto);
  }

  @Patch(':id')
  @Roles('TEACHER', 'ADMIN')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdatePathDto) {
    return this.paths.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('TEACHER', 'ADMIN')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.paths.remove(user, id);
  }
}
