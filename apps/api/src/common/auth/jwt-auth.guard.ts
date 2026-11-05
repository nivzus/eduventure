import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { env } from '../env';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../types';
import { IS_PUBLIC_KEY } from './public.decorator';

export interface JwtPayload {
  sub: string;
  tv: number;
}

export function extractAccessToken(req: Request): string | undefined {
  const cookie = (req.cookies as Record<string, string> | undefined)?.access_token;
  if (cookie) return cookie;
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  return undefined;
}

/** Global guard: verifies the `access_token` cookie (or Bearer header). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()]);
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = await this.resolveUser(req);
    if (user) req.user = user;
    if (isPublic) return true;
    if (!user) throw new UnauthorizedException('Giriş tələb olunur');
    return true;
  }

  private async resolveUser(req: Request): Promise<AuthUser | null> {
    const token = extractAccessToken(req);
    if (!token) return null;
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token, { secret: env.accessSecret });
    } catch {
      return null;
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true, tokenVersion: true },
    });
    if (!user || user.tokenVersion !== payload.tv) return null;
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }
}
