import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { AuthUser } from '../../common/types';
import { AssignmentsService } from './assignments.service';
import { AssignmentQueryDto, CreateAssignmentDto } from './dto/assignment.dto';

@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  /** My assignments (direct + via my groups) with `done` + `content` summary. */
  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.assignments.mine(user);
  }

  @Get()
  @Roles('TEACHER', 'ADMIN')
  list(@CurrentUser() user: AuthUser, @Query() q: AssignmentQueryDto) {
    return this.assignments.list(user, q);
  }

  @Post()
  @Roles('TEACHER', 'ADMIN')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAssignmentDto) {
    return this.assignments.create(user, dto);
  }

  @Delete(':id')
  @Roles('TEACHER', 'ADMIN')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.assignments.remove(user, id);
  }
}
