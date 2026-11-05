import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import {
  CreateAchievementDto,
  CreateQuestDto,
  LeaderboardQueryDto,
  UpdateAchievementDto,
  UpdateQuestDto,
} from './dto/gamification.dto';
import { GamificationQueryService } from './gamification-query.service';

@Controller()
export class GamificationController {
  constructor(private readonly q: GamificationQueryService) {}

  @Get('leaderboard')
  leaderboard(@Query() query: LeaderboardQueryDto) {
    return this.q.leaderboard(query.period ?? 'week', query.groupId, query.limit ?? 50);
  }

  @Get('achievements')
  achievements(@CurrentUser('id') userId: string) {
    return this.q.achievementsFor(userId);
  }

  @Get('quests')
  quests(@CurrentUser('id') userId: string) {
    return this.q.questsFor(userId);
  }

  @Post('quests/:id/claim')
  @HttpCode(200)
  claim(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.q.claim(userId, id);
  }
}

@Roles('ADMIN')
@Controller('admin')
export class AdminGamificationController {
  constructor(private readonly q: GamificationQueryService) {}

  @Get('quests')
  quests() {
    return this.q.adminQuests();
  }

  @Post('quests')
  createQuest(@Body() dto: CreateQuestDto) {
    return this.q.createQuest(dto);
  }

  @Patch('quests/:id')
  updateQuest(@Param('id') id: string, @Body() dto: UpdateQuestDto) {
    return this.q.updateQuest(id, dto);
  }

  @Delete('quests/:id')
  deleteQuest(@Param('id') id: string) {
    return this.q.deleteQuest(id);
  }

  @Get('achievements')
  achievements() {
    return this.q.adminAchievements();
  }

  @Post('achievements')
  createAchievement(@Body() dto: CreateAchievementDto) {
    return this.q.createAchievement(dto);
  }

  @Patch('achievements/:id')
  updateAchievement(@Param('id') id: string, @Body() dto: UpdateAchievementDto) {
    return this.q.updateAchievement(id, dto);
  }

  @Delete('achievements/:id')
  deleteAchievement(@Param('id') id: string) {
    return this.q.deleteAchievement(id);
  }
}
