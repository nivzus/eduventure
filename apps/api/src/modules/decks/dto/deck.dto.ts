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
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ContentStatus, Visibility } from '@prisma/client';

export class DeckQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsEnum(ContentStatus) status?: ContentStatus;
  @IsOptional() @IsString() mine?: string;
}

export class CardInputDto {
  /** Existing card id → updated in place (keeps review history); omitted → new card. */
  @IsOptional() @IsString() id?: string;
  @IsString() @IsNotEmpty() @MaxLength(2000) front: string;
  @IsString() @IsNotEmpty() @MaxLength(4000) back: string;
  @IsOptional() @IsString() @MaxLength(4000) example?: string | null;
}

export class CreateDeckDto {
  @IsString() @IsNotEmpty() @MaxLength(200) title: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string | null;
  @IsOptional() @IsString() @MaxLength(80) category?: string | null;
  @IsOptional() @IsEnum(ContentStatus) status?: ContentStatus;
  @IsOptional() @IsEnum(Visibility) visibility?: Visibility;
  @IsOptional() @IsString() @MaxLength(64) passcode?: string | null;
  @IsOptional() @IsArray() @IsString({ each: true }) groupIds?: string[];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => CardInputDto)
  cards?: CardInputDto[];
}

export class UpdateDeckDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string | null;
  @IsOptional() @IsString() @MaxLength(80) category?: string | null;
  @IsOptional() @IsEnum(ContentStatus) status?: ContentStatus;
  @IsOptional() @IsEnum(Visibility) visibility?: Visibility;
  @IsOptional() @IsString() @MaxLength(64) passcode?: string | null;
  @IsOptional() @IsArray() @IsString({ each: true }) groupIds?: string[];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => CardInputDto)
  cards?: CardInputDto[];
}

export class ReviewDto {
  /** 0 again · 1 hard · 2 good · 3 easy */
  @Type(() => Number) @IsInt() @IsIn([0, 1, 2, 3]) grade: number;
}
