import { QuestionType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class GenerateQuestionsDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  topic: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  count?: number;

  @IsOptional()
  @IsEnum(QuestionType)
  type?: QuestionType;

  /** CEFR (A1…C2) or beginner/intermediate/advanced */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  level?: string;
}
