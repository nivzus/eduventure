import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AuthUser } from '../../common/types';
import { SmartPracticeDto } from './dto/practice.dto';
import { PracticeService } from './practice.service';

@Controller('practice')
export class PracticeController {
  constructor(private readonly practice: PracticeService) {}

  @Get('weak-topics')
  weakTopics(@CurrentUser('id') userId: string) {
    return this.practice.weakTopics(userId);
  }

  @Post('smart')
  smart(@CurrentUser() user: AuthUser, @Body() dto: SmartPracticeDto) {
    return this.practice.smart(user, dto.tags, dto.count ?? 10);
  }
}
