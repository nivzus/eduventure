import { ArrayMaxSize, IsArray, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateGroupDto {
  @IsString() @IsNotEmpty() @MaxLength(120) name: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string | null;
  /** Token name (signal|ember|aurora|glacier|moss|danger) or hex color. */
  @IsOptional() @IsString() @MaxLength(32) color?: string | null;
  /** ADMIN only: assign another teacher. Defaults to the creator. */
  @IsOptional() @IsString() teacherId?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(500) @IsString({ each: true }) userIds?: string[];
}

export class UpdateGroupDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string | null;
  @IsOptional() @IsString() @MaxLength(32) color?: string | null;
  @IsOptional() @IsString() teacherId?: string;
}

export class AddMembersDto {
  @IsArray() @ArrayMaxSize(500) @IsString({ each: true }) @Matches(/\S/, { each: true }) userIds: string[];
}
