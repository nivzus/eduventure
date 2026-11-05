import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import type { CookieOptions, Request, Response } from 'express';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { env } from '../../common/env';
import { PrismaService } from '../../common/prisma/prisma.service';
import { publicUser } from '../../common/utils';
import { LoginDto, RegisterDto } from './dto/auth.dto';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';
const ACCESS_TTL_SEC = 15 * 60;
const REFRESH_TTL_SEC = 30 * 24 * 3600;

export type PublicUser = Omit<User, 'passwordHash' | 'tokenVersion'>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private cookieOpts(maxAgeSec: number): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.isProd && process.env.COOKIE_SECURE !== 'false',
      path: '/',
      maxAge: maxAgeSec * 1000,
    };
  }

  async issueTokens(user: Pick<User, 'id' | 'tokenVersion'>, res: Response): Promise<void> {
    const payload: JwtPayload = { sub: user.id, tv: user.tokenVersion };
    const [access, refresh] = await Promise.all([
      this.jwt.signAsync(payload, { secret: env.accessSecret, expiresIn: ACCESS_TTL_SEC }),
      this.jwt.signAsync(payload, { secret: env.refreshSecret, expiresIn: REFRESH_TTL_SEC }),
    ]);
    res.cookie(ACCESS_COOKIE, access, this.cookieOpts(ACCESS_TTL_SEC));
    res.cookie(REFRESH_COOKIE, refresh, this.cookieOpts(REFRESH_TTL_SEC));
  }

  clearCookies(res: Response): void {
    const base: CookieOptions = { httpOnly: true, sameSite: 'lax', path: '/' };
    res.clearCookie(ACCESS_COOKIE, base);
    res.clearCookie(REFRESH_COOKIE, base);
  }

  async register(dto: RegisterDto, res: Response): Promise<PublicUser> {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Bu e-poçt ilə artıq qeydiyyatdan keçilib');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, passwordHash },
    });
    await this.issueTokens(user, res);
    return publicUser(user);
  }

  async login(dto: LoginDto, res: Response): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('E-poçt və ya şifrə yanlışdır');
    }
    await this.issueTokens(user, res);
    return publicUser(user);
  }

  private async verifyRefresh(token: string | undefined): Promise<User | null> {
    if (!token) return null;
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, { secret: env.refreshSecret });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || user.tokenVersion !== payload.tv) return null;
      return user;
    } catch {
      return null;
    }
  }

  async refresh(req: Request, res: Response): Promise<PublicUser> {
    const cookies = (req.cookies ?? {}) as Record<string, string>;
    const bodyToken = (req.body as { refreshToken?: string } | undefined)?.refreshToken;
    const user = await this.verifyRefresh(cookies[REFRESH_COOKIE] ?? bodyToken);
    if (!user) {
      this.clearCookies(res);
      throw new UnauthorizedException('Sessiya bitib, yenidən daxil olun');
    }
    await this.issueTokens(user, res);
    return publicUser(user);
  }

  /** Invalidates all refresh tokens of the user (tokenVersion++) and clears cookies. */
  async logout(req: Request, res: Response, userId?: string): Promise<{ ok: true }> {
    let id = userId;
    if (!id) {
      const cookies = (req.cookies ?? {}) as Record<string, string>;
      id = (await this.verifyRefresh(cookies[REFRESH_COOKIE]))?.id;
    }
    if (id) {
      await this.prisma.user.update({ where: { id }, data: { tokenVersion: { increment: 1 } } }).catch(() => undefined);
    }
    this.clearCookies(res);
    return { ok: true };
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return publicUser(user);
  }
}
