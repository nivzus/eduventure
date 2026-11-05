import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsDate, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ContentType } from '@prisma/client';

export class AssignmentQueryDto {
  @IsOptional() @IsString() groupId?: string;
}

export class CreateAssignmentDto {
  @IsEnum(ContentType) contentType: ContentType;
  @IsString() @IsNotEmpty() contentId: string;
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) groupIds?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(500) @IsString({ each: true }) userIds?: string[];
  @IsOptional() @Type(() => Date) @IsDate() dueAt?: Date | null;
}
