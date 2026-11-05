import { AttemptMode, AttemptStatus } from '@prisma/client';
import { Allow, IsEnum, IsInt, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class StartAttemptDto {
  @IsOptional()
  @IsEnum(AttemptMode)
  mode?: AttemptMode;

  @IsOptional()
  @IsString()
  passcode?: string;
}

export class CheckAnswerDto {
  @IsString()
  questionId: string;

  @Allow()
  answer: unknown;
}

export class AutosaveDto {
  @IsObject()
  answers: Record<string, unknown>;
}

export class SubmitAttemptDto {
  @IsOptional()
  @IsObject()
  answers?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  timeSpentSec?: number;
}

export class GradeAttemptDto {
  /** {[questionId]: points} */
  @IsObject()
  points: Record<string, number>;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  feedback?: string;
}

export class AttemptListQueryDto {
  @IsOptional()
  @IsString()
  mine?: string;

  @IsOptional()
  @IsString()
  quizId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEnum(AttemptStatus)
  status?: AttemptStatus;

  @IsOptional()
  @IsEnum(AttemptMode)
  mode?: AttemptMode;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
