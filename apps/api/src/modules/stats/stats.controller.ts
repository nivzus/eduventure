import { Controller, Get, Param } from '@nestjs/common';
import { Roles } from '../../common/auth/roles.decorator';
import { StatsService } from './stats.service';

@Roles('TEACHER', 'ADMIN')
@Controller('stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get('overview')
  overview() {
    return this.stats.overview();
  }

  @Get('quizzes/:id')
  quiz(@Param('id') id: string) {
    return this.stats.quiz(id);
  }

  @Get('students/:id')
  student(@Param('id') id: string) {
    return this.stats.student(id);
  }

  @Get('groups/:id')
  group(@Param('id') id: string) {
    return this.stats.group(id);
  }
}
