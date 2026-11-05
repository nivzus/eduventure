import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ContentStatus, CourseItemType, Visibility } from '@prisma/client';

export class CourseQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() level?: string;
  @IsOptional() @IsEnum(ContentStatus) status?: ContentStatus;
  @IsOptional() @IsString() mine?: string;
}

export class CourseItemInputDto {
  @IsEnum(CourseItemType) type: CourseItemType;
  @IsOptional() @IsString() articleId?: string | null;
  @IsOptional() @IsString() quizId?: string | null;
  @IsOptional() @IsString() deckId?: string | null;
}

export class CreateCourseDto {
  @IsString() @IsNotEmpty() @MaxLength(200) title: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string | null;
  @IsOptional() @IsString() @MaxLength(500) coverUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(80) category?: string | null;
  @IsOptional() @IsString() @MaxLength(40) level?: string | null;
  @IsOptional() @IsEnum(ContentStatus) status?: ContentStatus;
  @IsOptional() @IsEnum(Visibility) visibility?: Visibility;
  @IsOptional() @IsString() @MaxLength(64) passcode?: string | null;
  @IsOptional() @IsArray() @IsString({ each: true }) groupIds?: string[];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CourseItemInputDto)
  items?: CourseItemInputDto[];
}

export class UpdateCourseDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string | null;
  @IsOptional() @IsString() @MaxLength(500) coverUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(80) category?: string | null;
  @IsOptional() @IsString() @MaxLength(40) level?: string | null;
  @IsOptional() @IsEnum(ContentStatus) status?: ContentStatus;
  @IsOptional() @IsEnum(Visibility) visibility?: Visibility;
  @IsOptional() @IsString() @MaxLength(64) passcode?: string | null;
  @IsOptional() @IsArray() @IsString({ each: true }) groupIds?: string[];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CourseItemInputDto)
  items?: CourseItemInputDto[];
}
