import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { AuthUser } from '../../common/types';
import { AttemptsService } from './attempts.service';
import {
  AttemptListQueryDto,
  AutosaveDto,
  CheckAnswerDto,
  GradeAttemptDto,
  StartAttemptDto,
  SubmitAttemptDto,
} from './dto/attempt.dto';

@Controller()
export class AttemptsController {
  constructor(private readonly attempts: AttemptsService) {}

  @Post('quizzes/:id/attempts')
  start(@Param('id') quizId: string, @CurrentUser() user: AuthUser, @Body() dto: StartAttemptDto) {
    return this.attempts.start(quizId, user, dto);
  }

  @Get('attempts')
  list(@CurrentUser() user: AuthUser, @Query() query: AttemptListQueryDto) {
    return this.attempts.list(user, query);
  }

  @Roles('TEACHER', 'ADMIN')
  @Get('attempts/pending-review')
  pending(@CurrentUser() user: AuthUser) {
    return this.attempts.pendingReview(user);
  }

  @Get('attempts/:id')
  get(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.attempts.get(id, user);
  }

  @Post('attempts/:id/check')
  @HttpCode(200)
  check(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: CheckAnswerDto) {
    return this.attempts.check(id, user, dto);
  }

  @Patch('attempts/:id/answers')
  autosave(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: AutosaveDto) {
    return this.attempts.autosave(id, user, dto.answers);
  }

  @Post('attempts/:id/submit')
  @HttpCode(200)
  submit(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: SubmitAttemptDto) {
    return this.attempts.submit(id, user, dto);
  }

  @Roles('TEACHER', 'ADMIN')
  @Post('attempts/:id/grade')
  @HttpCode(200)
  grade(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: GradeAttemptDto) {
    return this.attempts.grade(id, user, dto);
  }
}
