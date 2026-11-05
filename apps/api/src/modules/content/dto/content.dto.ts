import { ArrayMaxSize, IsArray, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Visibility } from '@prisma/client';

export class SetVisibilityDto {
  @IsEnum(Visibility)
  visibility: Visibility;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  passcode?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  groupIds?: string[];
}

export class UnlockDto {
  @IsString()
  @MaxLength(64)
  passcode: string;
}
