import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Public } from '../../common/auth/public.decorator';
import { AuthUser } from '../../common/types';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.register(dto, res);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.login(dto, res);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.refresh(req, res);
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response, @CurrentUser() user?: AuthUser) {
    return this.auth.logout(req, res, user?.id);
  }

  @Get('me')
  me(@CurrentUser('id') userId: string) {
    return this.auth.me(userId);
  }
}
