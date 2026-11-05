import { ArrayMaxSize, IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ContentStatus, Visibility } from '@prisma/client';

export class PathQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsEnum(ContentStatus) status?: ContentStatus;
  @IsOptional() @IsString() mine?: string;
}

export class CreatePathDto {
  @IsString() @IsNotEmpty() @MaxLength(200) title: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string | null;
  @IsOptional() @IsString() @MaxLength(500) coverUrl?: string | null;
  @IsOptional() @IsEnum(ContentStatus) status?: ContentStatus;
  @IsOptional() @IsEnum(Visibility) visibility?: Visibility;
  @IsOptional() @IsString() @MaxLength(64) passcode?: string | null;
  @IsOptional() @IsArray() @IsString({ each: true }) groupIds?: string[];
  /** Ordered course ids (replaces). */
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) courseIds?: string[];
}

export class UpdatePathDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string | null;
  @IsOptional() @IsString() @MaxLength(500) coverUrl?: string | null;
  @IsOptional() @IsEnum(ContentStatus) status?: ContentStatus;
  @IsOptional() @IsEnum(Visibility) visibility?: Visibility;
  @IsOptional() @IsString() @MaxLength(64) passcode?: string | null;
  @IsOptional() @IsArray() @IsString({ each: true }) groupIds?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) courseIds?: string[];
}
