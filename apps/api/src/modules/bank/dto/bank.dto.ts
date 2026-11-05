import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { QuestionType } from '@prisma/client';
import { QuestionInputDto } from '../../quizzes/dto/quiz.dto';

export class CreateBankQuestionDto extends QuestionInputDto {}

export class UpdateBankQuestionDto extends PartialType(QuestionInputDto) {}

export class BankListQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsEnum(QuestionType)
  type?: QuestionType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  difficulty?: number;

  @IsOptional()
  @IsString()
  mine?: string;
}

export class BankToQuizDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(300)
  @IsString({ each: true })
  questionIds: string[];

  @IsString()
  quizId: string;
}

export class BankBulkDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => QuestionInputDto)
  questions: QuestionInputDto[];
}
