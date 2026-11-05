import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CommentTarget } from '@prisma/client';

export class CommentQueryDto {
  @IsEnum(CommentTarget) targetType: CommentTarget;
  @IsString() @IsNotEmpty() targetId: string;
}

export class CreateCommentDto {
  @IsEnum(CommentTarget) targetType: CommentTarget;
  @IsString() @IsNotEmpty() targetId: string;
  @IsString() @IsNotEmpty() @MaxLength(5000) body: string;
  @IsOptional() @IsString() parentId?: string | null;
}
