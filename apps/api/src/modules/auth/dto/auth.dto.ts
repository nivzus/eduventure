import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

const trimLower = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class RegisterDto {
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Ad ən azı 2 simvol olmalıdır' })
  @MaxLength(80)
  name: string;

  @Transform(trimLower)
  @IsEmail({}, { message: 'Düzgün e-poçt ünvanı daxil edin' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Şifrə ən azı 6 simvol olmalıdır' })
  @MaxLength(128)
  password: string;
}

export class LoginDto {
  @Transform(trimLower)
  @IsEmail({}, { message: 'Düzgün e-poçt ünvanı daxil edin' })
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}
