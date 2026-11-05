import { PartialType } from '@nestjs/mapped-types';
import { QuestPeriod, QuestType } from '@prisma/client';
import { Allow, IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class LeaderboardQueryDto {
  @IsOptional()
  @IsIn(['week', 'month', 'all'])
  period?: 'week' | 'month' | 'all';

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

export class CreateQuestDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsEnum(QuestType)
  type: QuestType;

  @IsInt()
  @Min(1)
  target: number;

  @IsInt()
  @Min(0)
  xpReward: number;

  @IsEnum(QuestPeriod)
  period: QuestPeriod;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
export class UpdateQuestDto extends PartialType(CreateQuestDto) {}

export class CreateAchievementDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  code: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title: string;

  @IsString()
  @MaxLength(500)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  icon?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  xpReward?: number;

  /** e.g. {"type":"quizzes","count":10} — see AchievementRule */
  @Allow()
  rule?: unknown;
}
export class UpdateAchievementDto extends PartialType(CreateAchievementDto) {}
