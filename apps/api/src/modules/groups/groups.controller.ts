import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { AuthUser } from '../../common/types';
import { AddMembersDto, CreateGroupDto, UpdateGroupDto } from './dto/group.dto';
import { GroupsService } from './groups.service';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.groups.list(user);
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.groups.detail(user, id);
  }

  @Post()
  @Roles('TEACHER', 'ADMIN')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateGroupDto) {
    return this.groups.create(user, dto);
  }

  @Patch(':id')
  @Roles('TEACHER', 'ADMIN')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateGroupDto) {
    return this.groups.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('TEACHER', 'ADMIN')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.groups.remove(user, id);
  }

  @Post(':id/members')
  @Roles('TEACHER', 'ADMIN')
  addMembers(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: AddMembersDto) {
    return this.groups.addMembers(user, id, dto);
  }

  @Delete(':id/members/:userId')
  removeMember(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('userId') userId: string) {
    return this.groups.removeMember(user, id, userId);
  }
}
