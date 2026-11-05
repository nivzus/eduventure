import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ContentType } from '@prisma/client';

export class ToggleBookmarkDto {
  @IsEnum(ContentType) contentType: ContentType;
  @IsString() @IsNotEmpty() contentId: string;
}
