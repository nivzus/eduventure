import { Body, Controller, Delete, Get, Param, Patch, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { AuthUser } from '../../common/types';
import { ChangePasswordDto, SetRoleDto, UpdateMeDto, UsersQueryDto } from './dto/users.dto';
import { UsersService } from './users.service';

@Controller('me')
export class MeController {
  constructor(private readonly users: UsersService) {}

  @Patch()
  update(@CurrentUser('id') userId: string, @Body() dto: UpdateMeDto) {
    return this.users.updateMe(userId, dto);
  }

  @Patch('password')
  password(@CurrentUser('id') userId: string, @Body() dto: ChangePasswordDto, @Res({ passthrough: true }) res: Response) {
    return this.users.changePassword(userId, dto, res);
  }

  @Get('summary')
  summary(@CurrentUser('id') userId: string) {
    return this.users.summary(userId);
  }
}

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Roles('TEACHER', 'ADMIN')
  @Get()
  list(@Query() query: UsersQueryDto) {
    return this.users.list(query);
  }

  @Get(':id')
  profile(@Param('id') id: string, @CurrentUser() viewer: AuthUser) {
    return this.users.profile(id, viewer);
  }

  @Roles('ADMIN')
  @Patch(':id/role')
  setRole(@Param('id') id: string, @Body() dto: SetRoleDto, @CurrentUser() actor: AuthUser) {
    return this.users.setRole(id, dto.role, actor);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.users.remove(id, actor);
  }
}
