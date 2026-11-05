import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class UpdateMeDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  avatarUrl?: string | null;
}

export class ChangePasswordDto {
  @IsString()
  current: string;

  @IsString()
  @MinLength(6, { message: 'Yeni şifrə ən azı 6 simvol olmalıdır' })
  @MaxLength(128)
  next: string;
}

export class UsersQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}

export class SetRoleDto {
  @IsEnum(Role)
  role: Role;
}
