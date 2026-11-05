import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ContentStatus, Visibility } from '@prisma/client';

export class ArticleQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() tag?: string;
  @IsOptional() @IsEnum(ContentStatus) status?: ContentStatus;
  /** `mine=1` → only my own articles (studio). */
  @IsOptional() @IsString() mine?: string;
}

export class CreateArticleDto {
  @IsString() @IsNotEmpty() @MaxLength(200) title: string;
  @IsOptional() @IsString() @MaxLength(120) slug?: string;
  @IsOptional() @IsString() @MaxLength(600) excerpt?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() @MaxLength(500) coverUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(80) category?: string | null;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsEnum(ContentStatus) status?: ContentStatus;
  @IsOptional() @IsEnum(Visibility) visibility?: Visibility;
  @IsOptional() @IsString() @MaxLength(64) passcode?: string | null;
  /** Used when visibility = GROUPS. */
  @IsOptional() @IsArray() @IsString({ each: true }) groupIds?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) relatedQuizIds?: string[];
}

export class UpdateArticleDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(120) slug?: string;
  @IsOptional() @IsString() @MaxLength(600) excerpt?: string | null;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() @MaxLength(500) coverUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(80) category?: string | null;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsEnum(ContentStatus) status?: ContentStatus;
  @IsOptional() @IsEnum(Visibility) visibility?: Visibility;
  @IsOptional() @IsString() @MaxLength(64) passcode?: string | null;
  @IsOptional() @IsArray() @IsString({ each: true }) groupIds?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) relatedQuizIds?: string[];
}

export class ArticleProgressDto {
  @Type(() => Number) @IsInt() @Min(0) @Max(100) progress: number;
}

export const ANNOTATION_COLORS = ['signal', 'ember', 'aurora', 'glacier'] as const;

export class CreateAnnotationDto {
  @IsString() @IsNotEmpty() @MaxLength(5000) quote: string;
  @IsOptional() @IsString() @MaxLength(5000) note?: string | null;
  @IsOptional() @IsIn(ANNOTATION_COLORS) color?: (typeof ANNOTATION_COLORS)[number];
  @Type(() => Number) @IsInt() @Min(0) startOffset: number;
  @Type(() => Number) @IsInt() @Min(0) endOffset: number;
}

export class UpdateAnnotationDto {
  @IsOptional() @IsString() @MaxLength(5000) note?: string | null;
  @IsOptional() @IsIn(ANNOTATION_COLORS) color?: (typeof ANNOTATION_COLORS)[number];
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(5000) quote?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) startOffset?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) endOffset?: number;
}
