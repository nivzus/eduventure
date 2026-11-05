import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../types';

/** `@CurrentUser() user: AuthUser` or `@CurrentUser('id') userId: string`. Undefined on anonymous @Public routes. */
export const CurrentUser = createParamDecorator((field: keyof AuthUser | undefined, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
  const user = req.user;
  return field ? user?.[field] : user;
});
