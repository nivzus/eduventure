import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { AuthUser } from '../types';
import { ROLES_KEY } from './roles.decorator';

/** Global guard (runs after JwtAuthGuard). Enforces `@Roles(...)`; ADMIN always passes. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!roles || roles.length === 0) return true;
    const user = ctx.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    if (!user) throw new ForbiddenException('İcazə yoxdur');
    if (user.role === 'ADMIN' || roles.includes(user.role)) return true;
    throw new ForbiddenException('Bu əməliyyat üçün icazəniz yoxdur');
  }
}
