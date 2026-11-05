import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { AuthUser } from '../../common/types';
import { Passcode } from '../content/passcode.decorator';
import { CoursesService } from './courses.service';
import { CourseQueryDto, CreateCourseDto, UpdateCourseDto } from './dto/course.dto';

@Controller('courses')
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: CourseQueryDto) {
    return this.courses.list(user, q);
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string, @Passcode() passcode?: string) {
    return this.courses.detail(user, id, passcode);
  }

  @Post()
  @Roles('TEACHER', 'ADMIN')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCourseDto) {
    return this.courses.create(user, dto);
  }

  @Patch(':id')
  @Roles('TEACHER', 'ADMIN')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.courses.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('TEACHER', 'ADMIN')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.courses.remove(user, id);
  }

  @Post(':id/complete')
  complete(@CurrentUser() user: AuthUser, @Param('id') id: string, @Passcode() passcode?: string) {
    return this.courses.complete(user, id, passcode);
  }
}
