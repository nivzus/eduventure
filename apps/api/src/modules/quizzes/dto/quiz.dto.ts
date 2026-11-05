import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  Allow,
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ContentStatus, QuestionType, Visibility } from '@prisma/client';

/** Question payload used by quizzes and the bank. `correct` shape depends on `type` (SPEC §2). */
export class QuestionInputDto {
  /** Existing question id (kept on update so attempt history/stats stay linked). */
  @IsOptional()
  @IsString()
  id?: string;

  @IsEnum(QuestionType)
  type: QuestionType;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  text: string;

  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  options?: unknown[];

  @Allow()
  correct?: unknown;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  explanation?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  points?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  /** Bank only (1-3). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  difficulty?: number;
}

export class CreateQuizDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  coverColor?: string | null;

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  @IsOptional()
  @IsString()
  passcode?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  timeLimitSec?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  passPercent?: number;

  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;

  @IsOptional()
  @IsBoolean()
  shuffleOptions?: boolean;

  @IsOptional()
  @IsBoolean()
  showAnswers?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxAttempts?: number | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(300)
  @ValidateNested({ each: true })
  @Type(() => QuestionInputDto)
  questions?: QuestionInputDto[];
}

export class UpdateQuizDto extends PartialType(CreateQuizDto) {}

export class QuizListQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @IsOptional()
  @IsString()
  mine?: string;
}
