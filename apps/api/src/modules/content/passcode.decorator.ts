import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Optional passcode sent with a read request (`x-passcode` header or `?passcode=` query).
 * A correct value unlocks PASSCODE content (and the unlock is persisted for the user).
 */
export const Passcode = createParamDecorator((_: unknown, ctx: ExecutionContext): string | undefined => {
  const req = ctx.switchToHttp().getRequest<Request>();
  const header = req.headers['x-passcode'];
  const raw = Array.isArray(header) ? header[0] : header;
  const q = req.query?.passcode;
  const value = raw ?? (typeof q === 'string' ? q : undefined);
  return value && value.trim() ? value.trim() : undefined;
});
